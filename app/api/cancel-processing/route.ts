import { createServiceRoleClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }
    
    console.log(`🛑 Cancelling processing for document: ${documentId}`);
    
    const supabase = createServiceRoleClient();
    
    // Check if document exists and is processing
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
    
    // Only cancel if currently processing
    if (doc.status !== "processing") {
      return NextResponse.json(
        { error: "Document is not currently processing", status: doc.status },
        { status: 400 }
      );
    }
    
    // Update status back to pending
    const { error: updateError } = await supabase
      .from("documents")
      .update({ 
        status: "pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", documentId);
    
    if (updateError) {
      console.error("Failed to cancel processing:", updateError);
      throw updateError;
    }
    
    console.log(`✓ Processing cancelled for document ${documentId}`);
    
    return NextResponse.json({ 
      success: true,
      message: "Processing cancelled",
      documentId
    });
    
  } catch (error: any) {
    console.error("Cancel processing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel processing" },
      { status: 500 }
    );
  }
}
