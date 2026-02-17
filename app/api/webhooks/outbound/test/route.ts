import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { testWebhook, dispatchWebhook, WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhooks";

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json().catch(() => ({}));
  const webhookId = body?.webhookId as string | undefined;
  const event = body?.event as string | undefined;

  if (webhookId) {
    const result = await testWebhook(webhookId, user.id);
    return NextResponse.json({ success: true, mode: "single-webhook", result });
  }

  const fallbackEvent: WebhookEvent = "document.processed";
  const selectedEvent: WebhookEvent =
    typeof event === "string" && (WEBHOOK_EVENTS as readonly string[]).includes(event)
      ? (event as WebhookEvent)
      : fallbackEvent;

  const results = await dispatchWebhook(user.id, selectedEvent, {
    test: true,
    eventVersion: 1,
    generatedAt: new Date().toISOString(),
    payload: body?.payload || {},
  });

  return NextResponse.json({
    success: true,
    mode: "broadcast-event",
    event: selectedEvent,
    results,
  });
}
