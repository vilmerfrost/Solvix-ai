import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createOrUpdateReviewTask } from "@/lib/office/workflow";
import { createServiceRoleClient } from "@/lib/supabase";
import { webhookEvents } from "@/lib/webhooks";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  if (!body?.documentId) {
    return NextResponse.json({ success: false, error: "documentId is required" }, { status: 400 });
  }

  const task = await createOrUpdateReviewTask({
    documentId: body.documentId,
    userId: user.id,
    assignedTo: body.assignedTo || null,
    dueAt: body.dueAt || null,
    status: "assigned",
    notes: body.note || null,
  });

  const supabase = createServiceRoleClient();
  await supabase
    .from("documents")
    .update({
      assigned_reviewer_id: body.assignedTo || null,
      review_status: "assigned",
      due_at: body.dueAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.documentId)
    .eq("user_id", user.id);

  await logAuditEvent({
    userId: user.id,
    documentId: body.documentId,
    action: "document.review_assigned",
    description: "Review task assigned",
    metadata: { taskId: task.id, assignedTo: body.assignedTo || null },
  });

  await webhookEvents.documentReviewAssigned(user.id, body.documentId, task.id, body.assignedTo || null);
  return NextResponse.json({ success: true, taskId: task.id, status: task.status });
}
