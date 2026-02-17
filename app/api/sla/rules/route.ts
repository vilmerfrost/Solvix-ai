import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sla_rules")
    .select("*")
    .eq("user_id", user.id)
    .order("doc_type", { ascending: true });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, rules: data || [] });
}

export async function PATCH(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  if (!body?.docType) {
    return NextResponse.json({ success: false, error: "docType is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sla_rules")
    .upsert(
      {
        user_id: user.id,
        doc_type: body.docType,
        warning_minutes: body.warningMinutes ?? 60,
        breach_minutes: body.breachMinutes ?? 240,
        enabled: body.enabled ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,doc_type" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, rule: data });
}
