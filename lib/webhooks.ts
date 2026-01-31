/**
 * Webhook Dispatcher
 * 
 * Handles dispatching webhooks to configured endpoints with:
 * - HMAC signature verification
 * - Retry logic with exponential backoff
 * - Logging of all attempts
 */

import { createServiceRoleClient } from "./supabase";
import crypto from "crypto";

// Available webhook events
export const WEBHOOK_EVENTS = [
  "document.uploaded",
  "document.processed",
  "document.approved",
  "document.rejected",
  "document.failed",
  "export.complete",
  "batch.complete",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

interface WebhookConfig {
  id: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  total_sent?: number;
  total_success?: number;
  total_failed?: number;
}

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

interface DispatchResult {
  success: boolean;
  webhookId: string;
  status?: number;
  responseTime?: number;
  error?: string;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Dispatch a webhook event to all configured endpoints for a user
 */
export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<DispatchResult[]> {
  const supabase = createServiceRoleClient();
  
  // Get active webhooks for this user that listen for this event
  const { data: webhooks, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .contains("events", [event]);
  
  if (error || !webhooks || webhooks.length === 0) {
    return [];
  }
  
  const results: DispatchResult[] = [];
  
  // Dispatch to all matching webhooks
  for (const webhook of webhooks) {
    const result = await sendWebhook(webhook, event, data, supabase);
    results.push(result);
  }
  
  return results;
}

/**
 * Send a single webhook with retry logic
 */
async function sendWebhook(
  webhook: WebhookConfig,
  event: WebhookEvent,
  data: Record<string, unknown>,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<DispatchResult> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  
  const payloadString = JSON.stringify(payload);
  
  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Vextra-Event": event,
    "X-Vextra-Timestamp": payload.timestamp,
    "X-Vextra-Webhook-Id": webhook.id,
  };
  
  // Add signature if secret is configured
  if (webhook.secret) {
    const signature = generateSignature(payloadString, webhook.secret);
    headers["X-Vextra-Signature"] = `sha256=${signature}`;
  }
  
  // Create log entry
  const { data: logEntry } = await supabase
    .from("webhook_logs")
    .insert({
      webhook_id: webhook.id,
      event,
      payload,
      status: "pending",
    })
    .select()
    .single();
  
  // Retry configuration
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  let lastError: string | undefined;
  let responseStatus: number | undefined;
  let responseTime: number | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      responseTime = Date.now() - startTime;
      responseStatus = response.status;
      
      // Get response body (limited to 1KB for storage)
      let responseBody = "";
      try {
        const text = await response.text();
        responseBody = text.slice(0, 1000);
      } catch {
        // Ignore body read errors
      }
      
      if (response.ok) {
        // Success - update log and webhook stats
        if (logEntry) {
          await supabase
            .from("webhook_logs")
            .update({
              status: "success",
              attempts: attempt + 1,
              response_status: responseStatus,
              response_body: responseBody,
              response_time_ms: responseTime,
              delivered_at: new Date().toISOString(),
            })
            .eq("id", logEntry.id);
        }
        
        // Update webhook stats
        await supabase
          .from("webhooks")
          .update({
            total_sent: (webhook.total_sent || 0) + 1,
            total_success: (webhook.total_success || 0) + 1,
            last_triggered_at: new Date().toISOString(),
            last_status: responseStatus,
          })
          .eq("id", webhook.id);
        
        return {
          success: true,
          webhookId: webhook.id,
          status: responseStatus,
          responseTime,
        };
      }
      
      // Non-2xx response - may retry
      lastError = `HTTP ${responseStatus}: ${responseBody}`;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (responseStatus >= 400 && responseStatus < 500 && responseStatus !== 429) {
        break;
      }
      
    } catch (error) {
      lastError = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Network error";
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  if (logEntry) {
    await supabase
      .from("webhook_logs")
      .update({
        status: "failed",
        attempts: maxRetries,
        response_status: responseStatus,
        error_message: lastError,
        response_time_ms: responseTime,
      })
      .eq("id", logEntry.id);
  }
  
  // Update webhook failure stats
  await supabase
    .from("webhooks")
    .update({
      total_sent: (webhook.total_sent || 0) + 1,
      total_failed: (webhook.total_failed || 0) + 1,
      last_triggered_at: new Date().toISOString(),
      last_status: responseStatus || 0,
    })
    .eq("id", webhook.id);
  
  return {
    success: false,
    webhookId: webhook.id,
    status: responseStatus,
    responseTime,
    error: lastError,
  };
}

/**
 * Test a webhook configuration by sending a test event
 */
export async function testWebhook(
  webhookId: string,
  userId: string
): Promise<DispatchResult> {
  const supabase = createServiceRoleClient();
  
  const { data: webhook, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("id", webhookId)
    .eq("user_id", userId)
    .single();
  
  if (error || !webhook) {
    return {
      success: false,
      webhookId,
      error: "Webhook not found",
    };
  }
  
  const testData = {
    test: true,
    message: "This is a test webhook from Vextra AI",
    webhook_id: webhookId,
    webhook_name: webhook.name,
  };
  
  // Send test without recording in regular logs
  const payload = {
    event: "test",
    timestamp: new Date().toISOString(),
    data: testData,
  };
  
  const payloadString = JSON.stringify(payload);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Vextra-Event": "test",
    "X-Vextra-Timestamp": payload.timestamp,
    "X-Vextra-Webhook-Id": webhook.id,
  };
  
  if (webhook.secret) {
    const signature = generateSignature(payloadString, webhook.secret);
    headers["X-Vextra-Signature"] = `sha256=${signature}`;
  }
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000),
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      webhookId,
      status: response.status,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      webhookId,
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "Connection failed",
    };
  }
}

/**
 * Helper to dispatch common events
 */
export const webhookEvents = {
  documentUploaded: (userId: string, documentId: string, filename: string) =>
    dispatchWebhook(userId, "document.uploaded", { documentId, filename }),
  
  documentProcessed: (userId: string, documentId: string, filename: string, status: string) =>
    dispatchWebhook(userId, "document.processed", { documentId, filename, status }),
  
  documentApproved: (userId: string, documentId: string, filename: string) =>
    dispatchWebhook(userId, "document.approved", { documentId, filename }),
  
  documentRejected: (userId: string, documentId: string, filename: string, reason?: string) =>
    dispatchWebhook(userId, "document.rejected", { documentId, filename, reason }),
  
  documentFailed: (userId: string, documentId: string, filename: string, error: string) =>
    dispatchWebhook(userId, "document.failed", { documentId, filename, error }),
  
  exportComplete: (userId: string, exportId: string, documentCount: number, destination: string) =>
    dispatchWebhook(userId, "export.complete", { exportId, documentCount, destination }),
  
  batchComplete: (userId: string, batchId: string, total: number, success: number, failed: number) =>
    dispatchWebhook(userId, "batch.complete", { batchId, total, success, failed }),
};
