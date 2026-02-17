import { createServiceRoleClient } from "@/lib/supabase";
import { webhookEvents } from "@/lib/webhooks";
import { sendUserNotification } from "@/lib/email";

function minutesSince(dateIso: string): number {
  const then = new Date(dateIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 60000));
}

export async function evaluateSlaForDocument(params: {
  documentId: string;
  userId: string;
  docType?: string | null;
  createdAt: string;
  taskId?: string | null;
  userEmail?: string | null;
}): Promise<"none" | "warning" | "breach"> {
  const supabase = createServiceRoleClient();
  const docType = params.docType || "unknown_office";

  const { data: rule } = await supabase
    .from("sla_rules")
    .select("*")
    .eq("user_id", params.userId)
    .eq("doc_type", docType)
    .maybeSingle();

  const warningMinutes = rule?.warning_minutes ?? 60;
  const breachMinutes = rule?.breach_minutes ?? 240;
  const ageMinutes = minutesSince(params.createdAt);

  const risk: "none" | "warning" | "breach" =
    ageMinutes >= breachMinutes ? "breach" : ageMinutes >= warningMinutes ? "warning" : "none";

  await supabase.from("sla_evaluations").insert({
    document_id: params.documentId,
    task_id: params.taskId || null,
    user_id: params.userId,
    doc_type: docType,
    risk_level: risk,
    reason: `Age=${ageMinutes}m threshold warning=${warningMinutes} breach=${breachMinutes}`,
  });

  if (risk === "warning") {
    await webhookEvents.slaBreachRisk(params.userId, params.documentId, docType, {
      documentId: params.documentId,
      docType,
      ageMinutes,
      warningMinutes,
      breachMinutes,
    });
  }

  if (risk === "breach") {
    await webhookEvents.slaBreached(params.userId, params.documentId, docType, {
      documentId: params.documentId,
      docType,
      ageMinutes,
      warningMinutes,
      breachMinutes,
    });
    if (params.userEmail) {
      await sendUserNotification(
        params.userEmail,
        "SLA breach alert",
        `<p>Document <strong>${params.documentId}</strong> for <strong>${docType}</strong> exceeded SLA.</p>`
      );
    }
  }

  return risk;
}
