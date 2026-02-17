import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { transitionReviewTask } from "@/lib/office/workflow";
import { createServiceRoleClient } from "@/lib/supabase";
import { webhookEvents } from "@/lib/webhooks";

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  if (!body?.taskId || !body?.documentId) {
    return NextResponse.json({ success: false, error: "taskId and documentId are required" }, { status: 400 });
  }

  await transitionReviewTask({
    taskId: body.taskId,
    userId: user.id,
    nextStatus: "approved",
    note: body.note,
    payload: { editedFields: body.editedFields || [] },
  });

  const supabase = createServiceRoleClient();
  await supabase
    .from("documents")
    .update({
      status: "approved",
      review_status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.documentId)
    .eq("user_id", user.id);

  await webhookEvents.documentApproved(user.id, body.documentId, body.filename || "office-it-document");
  return NextResponse.json({ success: true });
}
