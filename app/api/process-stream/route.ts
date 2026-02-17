import { createServiceRoleClient } from "@/lib/supabase";
import { extractAdaptive } from "@/lib/adaptive-extraction";
import { getApiUser } from "@/lib/api-auth";
import { canProcessDocument } from "@/lib/stripe";
import * as XLSX from "xlsx";
import { processOfficeDocument } from "@/lib/office/orchestrator";

// SSE helper to format messages
function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Get settings from database
async function getSettings(userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  if (error) {
    console.log("No settings found, using defaults");
    return {};
  }
  return data || {};
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("id");
  
  if (!documentId) {
    return new Response("Document ID required", { status: 400 });
  }

  // Authentication check
  const { user, error: authError } = await getApiUser();
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Billing limit check
  const billingCheck = await canProcessDocument(user.id);
  if (!billingCheck.allowed) {
    return new Response(billingCheck.reason || "Document limit exceeded", { status: 402 });
  }
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper to send SSE message
      const send = (type: string, data: any) => {
        controller.enqueue(encoder.encode(formatSSE({ type, ...data })));
      };
      
      // Log callback for streaming
      const onLog = (message: string, level: string = 'info') => {
        send('log', { message, level, timestamp: new Date().toISOString() });
      };
      
      try {
        const supabase = createServiceRoleClient();
        const settings = await getSettings(user.id);
        
        // Get document and verify ownership
        const { data: doc, error: docError } = await supabase
          .from("documents")
          .select("*")
          .eq("id", documentId)
          .eq("user_id", user.id)
          .single();
        
        if (docError || !doc) {
          send('error', { message: 'Document not found or access denied' });
          controller.close();
          return;
        }
        
        send('start', { 
          documentId: doc.id, 
          filename: doc.filename,
          status: 'processing'
        });
        
        // Update status to processing
        await supabase
          .from("documents")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", documentId);
        
        // Download file
        let arrayBuffer: ArrayBuffer;
        
        if (doc.url) {
          onLog(`📥 Downloading from URL...`, 'info');
          const response = await fetch(doc.url);
          arrayBuffer = await response.arrayBuffer();
        } else if (doc.storage_path) {
          onLog(`📥 Downloading from storage...`, 'info');
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("raw_documents")
            .download(doc.storage_path);
          
          if (downloadError) {
            throw new Error(`Failed to download: ${downloadError.message}`);
          }
          arrayBuffer = await fileData.arrayBuffer();
        } else {
          throw new Error("No file URL or storage path");
        }
        
        onLog(`✓ File downloaded (${(arrayBuffer.byteLength / 1024).toFixed(0)} KB)`, 'success');
        const inferredDomain =
          doc.document_domain ||
          settings.default_document_domain ||
          (settings.industry && settings.industry !== "waste" ? "office_it" : "waste");

        if (inferredDomain === "office_it") {
          onLog("🏢 Processing with Office/IT orchestrator...", "info");
          const office = await processOfficeDocument({
            documentId: doc.id,
            userId: doc.user_id,
            filename: doc.filename,
            fileBuffer: arrayBuffer,
            settings,
          });

          await supabase
            .from("documents")
            .update({
              status: office.status,
              extracted_data: office.extractedData,
              document_domain: "office_it",
              doc_type: office.classification.finalDocType,
              schema_id: office.classification.schemaId || null,
              schema_version: (office.extractedData as any).schemaVersion || 1,
              classification_confidence: office.classification.modelConfidence,
              review_status: office.status === "approved" ? "approved" : "new",
              updated_at: new Date().toISOString(),
            })
            .eq("id", doc.id);

          send("complete", {
            status: office.status,
            documentDomain: "office_it",
            docType: office.classification.finalDocType,
            schemaId: office.classification.schemaId || null,
            classification: office.classification,
            completeness: (office.extractedData as any)?._validation?.completeness || 0,
            confidence: (office.extractedData as any)?._validation?.confidence || 0,
          });
          controller.close();
          return;
        }
        
        // Check file type
        const isExcel = doc.filename.match(/\.(xlsx|xls)$/i);
        
        if (!isExcel) {
          send('error', { message: 'Streaming only supported for Excel files' });
          controller.close();
          return;
        }
        
        // Process Excel file with streaming logs
        onLog(`📊 Starting adaptive extraction...`, 'info');
        
        const workbook = XLSX.read(arrayBuffer);
        
        // ✅ FIX: Process ALL sheets, not just the first one!
        onLog(`📄 Excel has ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}`, 'info');
        
        let allData: any[][] = [];
        
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
          
          if (sheetData.length === 0) {
            onLog(`   ⏭️ Skipping empty sheet: ${sheetName}`, 'info');
            continue;
          }
          
          onLog(`   📄 Sheet "${sheetName}": ${sheetData.length} rows`, 'info');
          
          if (allData.length === 0) {
            allData = sheetData;
          } else {
            const firstRowLooksLikeHeader = sheetData[0]?.some((cell: any) => 
              String(cell).toLowerCase().match(/datum|material|vikt|adress|kvantitet/)
            );
            allData = [...allData, ...(firstRowLooksLikeHeader && sheetData.length > 1 ? sheetData.slice(1) : sheetData)];
          }
        }
        
        const jsonData = allData;
        onLog(`✅ Combined ${jsonData.length} rows from all sheets`, 'success');
        
        // Run extraction with log callback
        const adaptiveResult = await extractAdaptive(
          jsonData as any[][],
          doc.filename,
          settings,
          onLog  // Pass the log callback!
        );
        
        // Convert to expected format
        const extractedData: any = {
          ...adaptiveResult,
          totalCostSEK: 0,
          documentType: "waste_report",
        };
        
        // Determine status
        const qualityScore = (adaptiveResult._validation.completeness + (adaptiveResult.metadata?.confidence || 0) * 100) / 2;
        const newStatus = qualityScore >= 90 ? "approved" : "needs_review";
        
        // Generate AI summary
        const rowCount = extractedData.metadata?.processedRows || extractedData.lineItems?.length || 0;
        const completeness = extractedData._validation.completeness;
        const confidence = extractedData.metadata?.confidence ? extractedData.metadata.confidence * 100 : 90;
        
        const aiSummary = completeness >= 95 && confidence >= 90
          ? `✓ Dokument med ${rowCount} rader från ${extractedData.uniqueAddresses} adresser. Total vikt: ${(extractedData.totalWeightKg/1000).toFixed(2)} ton. Data komplett (${confidence.toFixed(0)}% säkerhet) - redo för godkännande.`
          : `⚠️ Dokument med ${rowCount} rader. ${(100 - completeness).toFixed(0)}% data saknas, ${confidence.toFixed(0)}% säkerhet - behöver granskning.`;
        
        extractedData.aiSummary = aiSummary;
        
        // Save to database
        await supabase
          .from("documents")
          .update({
            status: newStatus,
            extracted_data: extractedData,
            updated_at: new Date().toISOString()
          })
          .eq("id", doc.id);
        
        // Send completion
        send('complete', {
          status: newStatus,
          extractedRows: rowCount,
          totalWeight: extractedData.totalWeightKg,
          confidence: confidence,
          completeness: completeness,
          uniqueAddresses: extractedData.uniqueAddresses,
          uniqueMaterials: extractedData.uniqueMaterials,
          processingLog: adaptiveResult._processingLog
        });
        
      } catch (error) {
        console.error("Stream processing error:", error);
        send('error', { message: (error instanceof Error ? error.message : String(error)) || 'Processing failed' });
        
        // Update document status to error
        const supabase = createServiceRoleClient();
        await supabase
          .from("documents")
          .update({ status: "error", updated_at: new Date().toISOString() })
          .eq("id", documentId);
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
