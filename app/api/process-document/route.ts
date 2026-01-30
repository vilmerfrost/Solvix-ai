import { createServiceRoleClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { processDocument } from "@/lib/process-document";

export const maxDuration = 300; // 5 minutes max for document processing

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }
    
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
    
  } catch (error: any) {
    console.error("Process document error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document" },
      { status: 500 }
    );
  }
}

