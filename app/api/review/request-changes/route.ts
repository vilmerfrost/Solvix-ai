import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { transitionReviewTask } from "@/lib/office/workflow";
import { createServiceRoleClient } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";

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
    nextStatus: "changes_requested",
    note: body.note,
    payload: { requestedChanges: body.requestedChanges || [] },
  });

  const supabase = createServiceRoleClient();
  await supabase
    .from("documents")
    .update({
      status: "needs_review",
      review_status: "changes_requested",
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.documentId)
    .eq("user_id", user.id);

  await logAuditEvent({
    userId: user.id,
    documentId: body.documentId,
    action: "document.review_requested_changes",
    description: "Requested changes in review",
    metadata: { taskId: body.taskId, note: body.note || null },
  });

  return NextResponse.json({ success: true });
}
