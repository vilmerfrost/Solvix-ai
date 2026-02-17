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
    nextStatus: "rejected",
    note: body.reason || body.note,
    payload: { reason: body.reason || null },
  });

  const supabase = createServiceRoleClient();
  await supabase
    .from("documents")
    .update({
      status: "needs_review",
      review_status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.documentId)
    .eq("user_id", user.id);

  await webhookEvents.documentRejected(
    user.id,
    body.documentId,
    body.filename || "office-it-document",
    body.reason || undefined
  );

  return NextResponse.json({ success: true });
}
