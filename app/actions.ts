"use server";

import { createServiceRoleClient } from "../lib/supabase";
import { revalidatePath } from "next/cache";

const STORAGE_BUCKET = "raw_documents";

// --- UPLOAD AND ENQUEUE DOCUMENT ---
// Uses the same multi-model pipeline as Azure sync
export async function uploadAndEnqueueDocument(formData: FormData) {
    const supabase = createServiceRoleClient();
    
    // Get real authenticated user
    const { requireAuth } = await import("@/lib/auth");
    const user = await requireAuth();
    
    const file = formData.get("file") as File;
    
    // Validate file
    if (!file) throw new Error("Ingen fil hittades i uppladdningen.");
    if (file.size === 0) throw new Error("Filen är tom (0 bytes).");
    
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error(`Filen är för stor (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max 50 MB.`);
    }
    
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !["pdf", "xlsx", "xls"].includes(fileExtension)) {
      throw new Error(`Filtypen "${fileExtension || 'okänd'}" stöds inte. Endast PDF och Excel.`);
    }
    
    // Generate content hash for duplicate detection
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { generateContentHash, checkForDuplicate } = await import("@/lib/duplicate-detection");
    const contentHash = generateContentHash(fileBuffer);

    // Upload to storage (user-scoped path)
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, { cacheControl: "3600", upsert: false });
    
    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Kunde inte ladda upp filen. Försök igen.");
    }

    // Check for duplicates before creating record
    const duplicateCheck = await checkForDuplicate(user.id, contentHash, null, file.name);
    
    // Save to database with real user ID + content hash + duplicate info
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({ 
        user_id: user.id, 
        filename: file.name, 
        storage_path: storagePath, 
        status: "uploaded",
        content_hash: contentHash,
        is_duplicate: duplicateCheck.isDuplicate,
        duplicate_of: duplicateCheck.matchedDocumentId || null,
      })
      .select()
      .single();
    
    if (documentError) {
      console.error("Database insert error:", documentError);
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => {});
      throw new Error("Kunde inte spara dokumentet. Försök igen.");
    }

    // Audit logging (non-blocking)
    import("@/lib/audit").then(({ auditDocumentUpload, auditDuplicateDetected }) => {
      auditDocumentUpload(user.id, document.id, file.name);
      if (duplicateCheck.isDuplicate && duplicateCheck.matchedDocumentId) {
        auditDuplicateDetected(
          user.id, document.id, duplicateCheck.matchedDocumentId,
          duplicateCheck.confidence, duplicateCheck.reason || '',
        );
      }
    }).catch(() => {});
    
    // Process using the REAL multi-model pipeline (same as Azure sync)
    try {
      const { processDocument: processDocumentMultiStep } = await import("@/lib/process-document");
      await processDocumentMultiStep(document.id);
    } catch (error) { 
      console.error("Process Error (upload succeeded):", error);
    }
    
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { message: "Uppladdat!", documentId: document.id };
}


/**
 * RE-VERIFY DOCUMENT (AI Dubbelkoll)
 * Reruns AI extraction using the correct multi-model pipeline
 * @param customInstructions - Optional extra instructions from user to guide the AI
 */
export async function reVerifyDocument(documentId: string, customInstructions?: string) {
  const supabase = createServiceRoleClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).single();
  if (!doc) throw new Error("Dokument hittades inte");

  await supabase.from("documents").update({ status: "processing" }).eq("id", documentId);

  try {
    // Use the correct multi-model pipeline for ALL document types
    const { processDocument: processDocumentMultiStep } = await import("@/lib/process-document");
    await processDocumentMultiStep(documentId, {
      customInstructions: customInstructions,
    });
    
    revalidatePath(`/review/${documentId}`);
    revalidatePath("/");
  } catch (error) {
    console.error("❌ Re-Verify Fail:", error);
    await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
    throw error;
  }
}

// ... (Behåll saveDocument, deleteDocument etc) ...
export async function saveDocument(formData: FormData) {
  const supabase = createServiceRoleClient();
  const id = formData.get("id") as string;
  
  // Get existing document to preserve all data
  const { data: existingDoc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  
  if (!existingDoc) {
    throw new Error("Document not found");
  }
  
  const existingData = existingDoc.extracted_data || {};
  const existingLineItems = existingData.lineItems || [];
  
  // Get edited document metadata from form
  const editedDate = formData.get("date") as string;
  const editedSupplier = formData.get("supplier") as string;
  const editedAddress = formData.get("address") as string;
  const editedReceiver = formData.get("receiver") as string;
  
  // Get lineItems from form, MERGING with existing data to preserve extra fields
  const lineItems: any[] = [];
  let index = 0;
  while (formData.get(`lineItems[${index}].material`) !== null) {
    const material = formData.get(`lineItems[${index}].material`) as string;
    const weightKg = parseFloat(formData.get(`lineItems[${index}].weightKg`) as string || "0");
    const address = formData.get(`lineItems[${index}].address`) as string;
    const location = formData.get(`lineItems[${index}].location`) as string;
    const receiver = formData.get(`lineItems[${index}].receiver`) as string;
    const handling = formData.get(`lineItems[${index}].handling`) as string;
    const isHazardous = formData.get(`lineItems[${index}].isHazardous`) === "true";
    const co2Saved = parseFloat(formData.get(`lineItems[${index}].co2Saved`) as string || "0");
    // ✅ NEW: Get row-specific date
    const rowDate = formData.get(`lineItems[${index}].date`) as string;
    
    if (material || weightKg > 0) {
      // PRESERVE: Start with original line item data (if exists) to keep extra fields
      // like wasteCode, costSEK, referensnummer, fordon, unit, etc.
      const originalItem = existingLineItems[index] || {};
      
      // Merge: original fields + edited fields (edited fields take priority)
      lineItems.push({
        ...originalItem, // Keep ALL original fields (wasteCode, costSEK, unit, etc.)
        // Override with edited values from form:
        material: { value: material || "", confidence: 1 },
        weightKg: { value: weightKg, confidence: 1 },
        address: address ? { value: address, confidence: 1 } : originalItem.address,
        location: location ? { value: location, confidence: 1 } : originalItem.location,
        receiver: receiver ? { value: receiver, confidence: 1 } : originalItem.receiver,
        handling: handling ? { value: handling, confidence: 1 } : originalItem.handling,
        isHazardous: { value: isHazardous, confidence: 1 },
        co2Saved: co2Saved > 0 ? { value: co2Saved, confidence: 1 } : originalItem.co2Saved,
        // ✅ NEW: Save row-specific date (critical for export!)
        date: rowDate ? { value: rowDate, confidence: 1 } : originalItem.date,
      });
    }
    index++;
  }
  
  // Get totals
  const totalCo2Saved = parseFloat(formData.get("totalCo2Saved") as string || "0");
  const weightKg = parseFloat(formData.get("weightKg") as string || "0");
  const cost = parseFloat(formData.get("cost") as string || "0");
  
  // Calculate total weight from lineItems if not provided
  const calculatedWeight = lineItems.reduce(
    (sum, item) => sum + (Number(item.weightKg?.value) || 0),
    0
  );
  const finalWeight = weightKg || calculatedWeight;
  
  // Update extracted_data with edited values
  const updatedData = {
    ...existingData,
    lineItems,
    totalWeightKg: finalWeight,
    totalCostSEK: cost,
    totalCo2Saved,
    // Update document-level metadata with edited values
    documentMetadata: {
      date: editedDate || existingData.documentMetadata?.date || "",
      supplier: editedSupplier || existingData.documentMetadata?.supplier || "",
      address: editedAddress || existingData.documentMetadata?.address || "",
      receiver: editedReceiver || existingData.documentMetadata?.receiver || "",
    },
    // Also update top-level fields for backward compatibility
    date: { value: editedDate || "", confidence: 1 },
    supplier: { value: editedSupplier || "", confidence: 1 },
    address: { value: editedAddress || "", confidence: 1 },
    receiver: { value: editedReceiver || "", confidence: 1 },
  };
  
  await supabase
    .from("documents")
    .update({
      extracted_data: updatedData,
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  
  revalidatePath("/dashboard");
  revalidatePath(`/review/${id}`);
  
  // Return success - let the client handle navigation
  return { success: true, documentId: id };
}
// (Behåll övriga exporterade funktioner)
export async function deleteDocument(formData: FormData) {
    const supabase = createServiceRoleClient();
    const id = formData.get("id") as string;
    const storagePath = formData.get("storagePath") as string;
    if (storagePath) await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    await supabase.from("documents").delete().eq("id", id);
    revalidatePath("/");
    revalidatePath("/archive");
    revalidatePath("/dashboard");
  }
export async function toggleArchive(formData: FormData) {
    const supabase = createServiceRoleClient();
    const id = formData.get("id") as string;
    const currentState = formData.get("currentState") === "true"; 
    await supabase.from("documents").update({ archived: !currentState }).eq("id", id);
    revalidatePath("/");
    revalidatePath("/archive");
}
export async function addMaterial(formData: FormData) {
    const supabase = createServiceRoleClient();
    const name = formData.get("name") as string;
    if (!name) return;
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    await supabase.from("materials").insert({ name: formattedName });
    revalidatePath("/settings");
    revalidatePath("/review/[id]", "page"); 
  }
export async function deleteMaterial(formData: FormData) {
    const supabase = createServiceRoleClient();
    const id = formData.get("id") as string;
    await supabase.from("materials").delete().eq("id", id);
    revalidatePath("/settings");
    revalidatePath("/review/[id]", "page");
}

/**
 * RETRY PROCESSING
 * Retries processing a document that failed (status = "error")
 * Uses the correct multi-model pipeline from lib/process-document.ts
 */
export async function retryProcessing(documentId: string) {
  const supabase = createServiceRoleClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).single();
  if (!doc) throw new Error("Dokument hittades inte");
  
  // Bara tillåt retry om dokumentet har status "error"
  if (doc.status !== "error") {
    throw new Error("Kan bara försöka igen på dokument med fel-status");
  }

  // Återställ status och kör via the correct multi-model pipeline
  await supabase.from("documents").update({ status: "uploaded" }).eq("id", documentId);
  
  try {
    const { processDocument: processDocumentMultiStep } = await import("@/lib/process-document");
    await processDocumentMultiStep(documentId);
    revalidatePath("/");
    revalidatePath("/archive");
  } catch (error) {
    // Om det fortfarande misslyckas, sätt tillbaka till error
    await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
    throw error;
  }
}

/**
 * ARKIVERA ALLA DOKUMENT
 * Sätter archived = true på alla dokument som inte redan är arkiverade
 */
export async function archiveAllDocuments() {
  const supabase = createServiceRoleClient();
  
  // Uppdatera alla dokument som INTE är arkiverade
  const { error } = await supabase
    .from("documents")
    .update({ archived: true })
    .eq("archived", false); // Påverkar bara den aktiva listan

  if (error) {
    console.error("Archive All Error:", error);
    throw new Error("Kunde inte arkivera allt.");
  }

  revalidatePath("/");
  revalidatePath("/archive");
}

/**
 * GODKÄNN ALLA DOKUMENT
 * Sätter status = "approved" på alla dokument som behöver granskas
 */
export async function verifyAllDocuments() {
  const supabase = createServiceRoleClient();
  
  // Uppdatera alla dokument som behöver granskas eller är i processing
  const { error } = await supabase
    .from("documents")
    .update({ status: "approved" })
    .in("status", ["needs_review", "processing", "uploaded", "queued"]);

  if (error) {
    console.error("Verify All Error:", error);
    throw new Error("Kunde inte godkänna allt.");
  }

  revalidatePath("/");
  revalidatePath("/review/[id]", "page");
}

/**
 * REJECT DOCUMENT (Review workflow)
 * Rejects a document for manual processing
 */
export async function rejectDocument(formData: FormData) {
  const supabase = createServiceRoleClient();
  const id = formData.get("id") as string;
  const reason = formData.get("reason") as string | null;

  // Get current extracted_data
  const { data: currentDoc } = await supabase
    .from("documents")
    .select("extracted_data")
    .eq("id", id)
    .single();

  await supabase
    .from("documents")
    .update({
      status: "rejected",
      extracted_data: {
        ...(currentDoc?.extracted_data || {}),
        rejected: true,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || "Manual rejection",
      },
    })
    .eq("id", id);

  revalidatePath("/dashboard");
  revalidatePath("/");
}