import { createServiceRoleClient } from "@/lib/supabase";
import { webhookEvents } from "@/lib/webhooks";
import { logAuditEvent } from "@/lib/audit";
import type { ReviewTaskStatus } from "./types";

export async function createOrUpdateReviewTask(params: {
  documentId: string;
  userId: string;
  assignedTo?: string | null;
  dueAt?: string | null;
  status?: ReviewTaskStatus;
  notes?: string | null;
}): Promise<{ id: string; status: ReviewTaskStatus }> {
  const supabase = createServiceRoleClient();
  const status = params.status || "new";

  const { data: existing } = await supabase
    .from("review_tasks")
    .select("*")
    .eq("document_id", params.documentId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("review_tasks")
      .update({
        assigned_to: params.assignedTo ?? existing.assigned_to,
        due_at: params.dueAt ?? existing.due_at,
        status,
        notes: params.notes ?? existing.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return { id: updated.id, status: updated.status };
  }

  const { data: created, error } = await supabase
    .from("review_tasks")
    .insert({
      document_id: params.documentId,
      user_id: params.userId,
      assigned_to: params.assignedTo || null,
      due_at: params.dueAt || null,
      status,
      notes: params.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { id: created.id, status: created.status };
}

export async function transitionReviewTask(params: {
  taskId: string;
  userId: string;
  nextStatus: ReviewTaskStatus;
  note?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: task, error: taskError } = await supabase
    .from("review_tasks")
    .select("*")
    .eq("id", params.taskId)
    .single();
  if (taskError || !task) throw taskError || new Error("Task not found");

  const { error } = await supabase
    .from("review_tasks")
    .update({
      status: params.nextStatus,
      updated_at: new Date().toISOString(),
      notes: params.note || task.notes,
    })
    .eq("id", params.taskId);
  if (error) throw error;

  await supabase.from("review_task_events").insert({
    task_id: params.taskId,
    user_id: params.userId,
    event_type: `review.${params.nextStatus}`,
    payload: params.payload || {},
  });

  await logAuditEvent({
    userId: params.userId,
    documentId: task.document_id,
    action:
      params.nextStatus === "approved"
        ? "document.approved"
        : params.nextStatus === "rejected"
          ? "document.rejected"
          : "document.reviewed",
    description: `Review task moved to ${params.nextStatus}`,
    metadata: { taskId: params.taskId, status: params.nextStatus, note: params.note || null },
  });

  if (task.document_id) {
    const webhookEvent =
      params.nextStatus === "approved"
        ? "document.approved"
        : params.nextStatus === "rejected"
          ? "document.rejected"
          : null;

    if (webhookEvent) {
      await webhookEvents.documentProcessed(params.userId, task.document_id, "review-task", params.nextStatus);
    }
  }
}
