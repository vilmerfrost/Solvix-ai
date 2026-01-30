import { createServiceRoleClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { documentIds } = await req.json();
    
    if (!documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: "Document IDs array required" },
        { status: 400 }
      );
    }
    
    console.log(`🛑 Cancelling batch processing for ${documentIds.length} documents`);
    
    const supabase = createServiceRoleClient();
    
    // Update all processing documents back to pending
    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update({ 
        status: "pending",
        updated_at: new Date().toISOString()
      })
      .in("id", documentIds)
      .eq("status", "processing")
      .select("id");
    
    if (updateError) {
      console.error("Failed to cancel batch:", updateError);
      throw updateError;
    }
    
    const cancelledCount = updated?.length || 0;
    console.log(`✓ Cancelled ${cancelledCount} document(s)`);
    
    return NextResponse.json({ 
      success: true,
      message: `Cancelled ${cancelledCount} documents`,
      cancelled: cancelledCount
    });
    
  } catch (error: any) {
    console.error("Cancel batch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel batch" },
      { status: 500 }
    );
  }
}
