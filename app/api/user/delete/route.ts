/**
 * User Account Deletion API
 * GDPR compliant account deletion (rätten att bli glömd)
 */

import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function DELETE() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const supabase = createServiceRoleClient();

    console.log(`🗑️ Deleting account for user ${user.id}`);

    // Delete in correct order to respect foreign key constraints
    // 1. Usage tracking
    await supabase.from("usage_tracking").delete().eq("user_id", user.id);
    console.log("   ✓ Usage tracking deleted");

    // 2. Processing sessions
    await supabase.from("processing_sessions").delete().eq("user_id", user.id);
    console.log("   ✓ Processing sessions deleted");

    // 3. Processing jobs (via document_id)
    const { data: userDocs } = await supabase
      .from("documents")
      .select("id")
      .eq("user_id", user.id);
    
    if (userDocs && userDocs.length > 0) {
      const docIds = userDocs.map((d) => d.id);
      await supabase.from("processing_jobs").delete().in("document_id", docIds);
    }
    console.log("   ✓ Processing jobs deleted");

    // 4. Documents
    await supabase.from("documents").delete().eq("user_id", user.id);
    console.log("   ✓ Documents deleted");

    // 5. User API keys
    await supabase.from("user_api_keys").delete().eq("user_id", user.id);
    console.log("   ✓ API keys deleted");

    // 6. Azure connections
    await supabase.from("azure_connections").delete().eq("user_id", user.id);
    console.log("   ✓ Azure connections deleted");

    // 7. Subscription
    await supabase.from("subscriptions").delete().eq("user_id", user.id);
    console.log("   ✓ Subscription deleted");

    // 8. Settings
    await supabase.from("settings").delete().eq("user_id", user.id);
    console.log("   ✓ Settings deleted");

    // 9. Delete auth user (this will sign them out)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      console.error("   ⚠️ Auth user deletion failed:", authDeleteError.message);
      // Continue anyway - data is deleted
    } else {
      console.log("   ✓ Auth user deleted");
    }

    console.log(`✅ Account deletion complete for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
