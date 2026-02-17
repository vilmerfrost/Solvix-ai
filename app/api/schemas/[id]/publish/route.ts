import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: schema, error } = await supabase
    .from("schema_templates")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !schema) {
    return NextResponse.json({ success: false, error: "Schema not found" }, { status: 404 });
  }

  const { error: publishError } = await supabase
    .from("schema_templates")
    .update({
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (publishError) {
    return NextResponse.json({ success: false, error: publishError.message }, { status: 500 });
  }

  const { error: versionError } = await supabase
    .from("schema_template_versions")
    .update({ published_at: new Date().toISOString() })
    .eq("schema_id", id)
    .eq("version", schema.current_version || 1);

  if (versionError) {
    return NextResponse.json({ success: false, error: versionError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, schemaId: id, publishedVersion: schema.current_version || 1 });
}
