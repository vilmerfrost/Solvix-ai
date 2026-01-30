import { createServiceRoleClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { processDocument } from "@/lib/process-document";

export const maxDuration = 300; // 5 minutes max for batch processing

export async function POST(req: Request) {
  try {
    const { documentIds, modelId, customInstructions } = await req.json();
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "Document IDs array required" },
        { status: 400 }
      );
    }
    
    console.log(`📦 Batch processing requested for ${documentIds.length} documents`);
    if (modelId) console.log(`   Model: ${modelId}`);
    if (customInstructions) console.log(`   Custom instructions provided`);
    
    const supabase = createServiceRoleClient();
    
    // Verify all documents exist and are in uploaded status
    const { data: docs, error: fetchError } = await supabase
      .from("documents")
      .select("id, status")
      .in("id", documentIds);
    
    if (fetchError) {
      console.error("Failed to fetch documents:", fetchError);
      throw fetchError;
    }
    
    const validDocs = docs?.filter(d => d.status === "uploaded") || [];
    
    if (validDocs.length === 0) {
      return NextResponse.json(
        { error: "No documents in 'uploaded' status found" },
        { status: 400 }
      );
    }
    
    const validIds = validDocs.map(d => d.id);
    
    // Update all to processing status
    const { error: updateError } = await supabase
      .from("documents")
      .update({ 
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .in("id", validIds);
    
    if (updateError) {
      console.error("Failed to update batch status:", updateError);
      throw updateError;
    }
    
    console.log(`✓ ${validIds.length} documents marked as 'processing'`);
    
    // Process documents directly (no HTTP calls needed!)
    // This runs synchronously to avoid Vercel auth issues with internal HTTP calls
    console.log(`🚀 Starting direct processing...`);
    
    const results: any[] = [];
    for (let i = 0; i < validIds.length; i++) {
      const docId = validIds[i];
      console.log(`📊 Processing ${i + 1}/${validIds.length} (${docId})`);
      
      try {
        const result = await processDocument(docId);
        results.push(result);
        console.log(`   ✅ ${result.status}`);
      } catch (err: any) {
        console.error(`   ❌ Error: ${err.message}`);
        results.push({
          success: false,
          documentId: docId,
          status: "error",
          error: err.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Batch complete: ${successCount} succeeded, ${failCount} failed`);
    
    return NextResponse.json({ 
      success: true,
      message: `Processed ${validIds.length} documents: ${successCount} succeeded, ${failCount} failed`,
      count: validIds.length,
      documentIds: validIds,
      results
    });
    
  } catch (error: any) {
    console.error("Batch process error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start batch processing" },
      { status: 500 }
    );
  }
}

