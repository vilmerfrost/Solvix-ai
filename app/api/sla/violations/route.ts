import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { searchParams } = new URL(request.url);
  const risk = searchParams.get("risk");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || "50")));

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("sla_evaluations")
    .select("*")
    .eq("user_id", user.id)
    .order("evaluated_at", { ascending: false })
    .limit(limit);

  if (risk) query = query.eq("risk_level", risk);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, violations: data || [] });
}
