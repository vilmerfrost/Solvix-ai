import { createServiceRoleClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { processDocument } from "@/lib/process-document";
import { validateDocumentId, checkRateLimit } from "@/lib/validation";
import { captureException } from "@/lib/sentry";

export const maxDuration = 300; // 5 minutes max for document processing

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(`process-doc:${clientIP}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    
    // Validate document ID
    const validation = validateDocumentId(body.documentId);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors?.[0] || "Invalid document ID" },
        { status: 400 }
      );
    }
    
    const documentId = validation.data;
    
    console.log(`📄 Processing document: ${documentId}`);
    
    const supabase = createServiceRoleClient();
    
    // Check if document exists
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    
    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    // Check if document is already processing or approved
    if (doc.status === "processing") {
      return NextResponse.json(
        { error: "Document is already being processed" },
        { status: 400 }
      );
    }
    
    if (doc.status === "approved") {
      return NextResponse.json(
        { error: "Document is already approved" },
        { status: 400 }
      );
    }
    
    // Update status to processing
    const { error: updateError } = await supabase
      .from("documents")
      .update({ 
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId);
    
    if (updateError) {
      console.error("Failed to update document status:", updateError);
      throw updateError;
    }
    
    console.log(`✓ Document ${documentId} marked as processing`);
    
    // Process the document directly (no HTTP call needed!)
    console.log(`🚀 Starting direct processing...`);
    const result = await processDocument(documentId);
    
    if (result.success) {
      console.log(`✅ Processing complete: ${result.status}`);
    } else {
      console.log(`❌ Processing failed: ${result.error}`);
    }
    
    return NextResponse.json({ 
      success: result.success,
      message: result.success ? "Processing complete" : result.error,
      documentId,
      status: result.status
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Failed to process document";
    console.error("Process document error:", errorMessage);
    
    // Report to Sentry
    if (error instanceof Error) {
      captureException(error, { route: "/api/process-document" });
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

