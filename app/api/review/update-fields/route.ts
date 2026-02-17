import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  const documentId = body?.documentId as string | undefined;
  const fields = body?.fields as Record<string, unknown> | undefined;
  if (!documentId || !fields || typeof fields !== "object") {
    return NextResponse.json(
      { success: false, error: "documentId and fields are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("id, user_id, extracted_data")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
  }

  const extracted = (doc.extracted_data || {}) as Record<string, unknown>;
  const existingFields =
    extracted.fields && typeof extracted.fields === "object"
      ? (extracted.fields as Record<string, unknown>)
      : {};
  const nextExtracted = {
    ...extracted,
    fields: {
      ...existingFields,
      ...fields,
    },
  };

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      extracted_data: nextExtracted,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  await logAuditEvent({
    userId: user.id,
    documentId,
    action: "document.edited",
    description: "Updated extracted fields",
    metadata: { updatedFieldKeys: Object.keys(fields) },
  });

  return NextResponse.json({ success: true });
}
