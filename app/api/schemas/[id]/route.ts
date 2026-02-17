import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceRoleClient();

  const { data: current, error: currentError } = await supabase
    .from("schema_templates")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ success: false, error: "Schema not found" }, { status: 404 });
  }

  const nextVersion = (current.current_version || 1) + 1;
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.name === "string") updatePayload.name = body.name;
  if (typeof body.docType === "string") updatePayload.doc_type = body.docType;

  const { error: updateError } = await supabase
    .from("schema_templates")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  if (body.definition || body.fields || body.tables || body.rules) {
    const definition = body.definition || {
      version: nextVersion,
      docType: body.docType || current.doc_type,
      fields: body.fields || [],
      tables: body.tables || [],
      rules: body.rules || [],
    };

    const { error: versionError } = await supabase
      .from("schema_template_versions")
      .insert({
        schema_id: id,
        version: nextVersion,
        definition,
        created_by: user.id,
      });

    if (versionError) {
      return NextResponse.json({ success: false, error: versionError.message }, { status: 500 });
    }

    await supabase
      .from("schema_templates")
      .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true, schemaId: id });
}
