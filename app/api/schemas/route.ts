import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("schema_templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("document_domain", "office_it")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, schemas: data || [] });
}

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  if (!body?.name || !body?.docType) {
    return NextResponse.json(
      { success: false, error: "name and docType are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const { data: schema, error: createError } = await supabase
    .from("schema_templates")
    .insert({
      user_id: user.id,
      name: body.name,
      doc_type: body.docType,
      document_domain: "office_it",
      status: "draft",
      current_version: 1,
    })
    .select()
    .single();

  if (createError || !schema) {
    return NextResponse.json(
      { success: false, error: createError?.message || "Failed to create schema" },
      { status: 500 }
    );
  }

  const definition = body.definition || {
    version: 1,
    docType: body.docType,
    fields: body.fields || [],
    tables: body.tables || [],
    rules: body.rules || [],
  };

  const { error: versionError } = await supabase.from("schema_template_versions").insert({
    schema_id: schema.id,
    version: 1,
    definition,
    created_by: user.id,
  });

  if (versionError) {
    return NextResponse.json({ success: false, error: versionError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, schema });
}
