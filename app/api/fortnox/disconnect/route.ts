import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("fortnox_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
