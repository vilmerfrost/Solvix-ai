import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const supabase = createServiceRoleClient();
  const [{ data: connection, error: connectionError }, { data: latestLog, error: logError }] =
    await Promise.all([
      supabase
        .from("fortnox_connections")
        .select(
          "id, fortnox_company_name, fortnox_org_number, is_active, auto_sync, sync_from_date, last_sync_at"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("fortnox_sync_logs")
        .select("id, status, imported_count, skipped_count, failed_count, sync_started_at, sync_finished_at, message")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (connectionError || logError) {
    return NextResponse.json(
      { success: false, error: connectionError?.message || logError?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    connected: Boolean(connection?.is_active),
    connection,
    latestLog,
  });
}

export async function PATCH(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("fortnox_connections")
    .update({
      auto_sync: body?.autoSync !== false,
      sync_from_date: body?.syncFromDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select(
      "id, fortnox_company_name, fortnox_org_number, is_active, auto_sync, sync_from_date, last_sync_at"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, connection: data });
}
