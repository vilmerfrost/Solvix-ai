import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || "50")));

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("review_tasks")
    .select("*, documents(id, filename, status, doc_type, document_domain, extracted_data, created_at, due_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, tasks: data || [] });
}
