/**
 * Reset/Clean Documents API
 * Deletes all documents for the current user from the database
 * Azure source files remain untouched - allows fresh re-import
 */

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const supabase = createServiceRoleClient();

    console.log("\n" + "=".repeat(60));
    console.log("🧹 RESET DOCUMENTS: Starting cleanup...");
    console.log(`   👤 User: ${user.id}`);
    console.log("=".repeat(60));

    // Get count before deletion
    const { count: beforeCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    console.log(`   📊 Documents to delete: ${beforeCount || 0}`);

    if (!beforeCount || beforeCount === 0) {
      console.log("   ✅ No documents to delete");
      return NextResponse.json({
        success: true,
        message: "No documents to clean up",
        deleted: 0,
      });
    }

    // Get storage paths before deleting documents (for cleanup)
    const { data: docsToDelete } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("user_id", user.id);

    // Delete from Supabase storage first
    if (docsToDelete && docsToDelete.length > 0) {
      const storagePaths = docsToDelete
        .map(d => d.storage_path)
        .filter(Boolean);

      if (storagePaths.length > 0) {
        console.log(`   🗑️ Cleaning up ${storagePaths.length} storage files...`);
        
        // Delete in batches of 100
        for (let i = 0; i < storagePaths.length; i += 100) {
          const batch = storagePaths.slice(i, i + 100);
          const { error: storageError } = await supabase.storage
            .from("raw_documents")
            .remove(batch);
          
          if (storageError) {
            console.warn(`   ⚠️ Storage cleanup error (batch ${i}):`, storageError.message);
            // Continue anyway - database cleanup is more important
          }
        }
      }
    }

    // Delete all documents for this user
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("   ❌ Delete error:", deleteError.message);
      return NextResponse.json(
        { error: `Failed to delete documents: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Verify deletion
    const { count: afterCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    console.log("\n" + "=".repeat(60));
    console.log("✅ RESET DOCUMENTS: Complete");
    console.log(`   🗑️ Deleted: ${beforeCount} documents`);
    console.log(`   📊 Remaining: ${afterCount || 0}`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${beforeCount} document(s). You can now fetch fresh files from Azure.`,
      deleted: beforeCount,
      remaining: afterCount || 0,
    });
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ RESET DOCUMENTS: Error");
    console.error(`   ${error?.message || error}`);
    console.error("=".repeat(60) + "\n");
    
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || "Failed to reset documents" },
      { status: 500 }
    );
  }
}
