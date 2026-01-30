/**
 * Usage Tracking Service
 * Tracks AI usage and costs for billing/display
 */

import { createServiceRoleClient } from "./supabase";
import { getModelById } from "@/config/models";

interface UsageRecord {
  userId: string;
  modelId: string;
  documentId?: string;
  inputTokens: number;
  outputTokens: number;
  processingTimeMs: number;
  success: boolean;
  errorMessage?: string;
}

interface UsageSummary {
  totalExtractions: number;
  totalTokens: number;
  totalCostSek: number;
  successfulExtractions: number;
  failedExtractions: number;
}

/**
 * Track usage of an AI model
 */
export async function trackUsage(record: UsageRecord): Promise<void> {
  const supabase = createServiceRoleClient();
  
  // Get model info for pricing
  const model = getModelById(record.modelId);
  
  // Calculate cost in SEK
  let costSek = 0;
  if (model) {
    const inputCost = (record.inputTokens / 1_000_000) * model.pricingPerMillionTokens.input;
    const outputCost = (record.outputTokens / 1_000_000) * model.pricingPerMillionTokens.output;
    costSek = inputCost + outputCost;
  }

  const { error } = await supabase
    .from("usage_tracking")
    .insert({
      user_id: record.userId,
      model_id: record.modelId,
      provider: model?.provider || "unknown",
      document_id: record.documentId || null,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      cost_sek: costSek,
      processing_time_ms: record.processingTimeMs,
      success: record.success,
      error_message: record.errorMessage || null,
    });

  if (error) {
    console.error("Failed to track usage:", error);
    // Don't throw - usage tracking failure shouldn't break the app
  }
}

/**
 * Get current month usage summary for a user
 */
export async function getCurrentMonthUsage(userId: string): Promise<UsageSummary> {
  const supabase = createServiceRoleClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("input_tokens, output_tokens, cost_sek, success")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  if (error) {
    console.error("Failed to get usage:", error);
    return {
      totalExtractions: 0,
      totalTokens: 0,
      totalCostSek: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
    };
  }

  const records = data || [];
  
  return {
    totalExtractions: records.length,
    totalTokens: records.reduce((sum, r) => sum + (r.input_tokens || 0) + (r.output_tokens || 0), 0),
    totalCostSek: Math.round(records.reduce((sum, r) => sum + (r.cost_sek || 0), 0) * 100) / 100,
    successfulExtractions: records.filter(r => r.success).length,
    failedExtractions: records.filter(r => !r.success).length,
  };
}

/**
 * Get usage by model for a user
 */
export async function getUsageByModel(userId: string): Promise<Record<string, {
  count: number;
  tokens: number;
  costSek: number;
}>> {
  const supabase = createServiceRoleClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("model_id, input_tokens, output_tokens, cost_sek")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  if (error || !data) {
    console.error("Failed to get usage by model:", error);
    return {};
  }

  const byModel: Record<string, { count: number; tokens: number; costSek: number }> = {};

  for (const record of data) {
    const modelId = record.model_id;
    if (!byModel[modelId]) {
      byModel[modelId] = { count: 0, tokens: 0, costSek: 0 };
    }
    byModel[modelId].count++;
    byModel[modelId].tokens += (record.input_tokens || 0) + (record.output_tokens || 0);
    byModel[modelId].costSek += record.cost_sek || 0;
  }

  // Round costs
  for (const model of Object.keys(byModel)) {
    byModel[model].costSek = Math.round(byModel[model].costSek * 100) / 100;
  }

  return byModel;
}

/**
 * Get daily usage for the last N days
 */
export async function getDailyUsage(userId: string, days: number = 30): Promise<Array<{
  date: string;
  extractions: number;
  tokens: number;
  costSek: number;
}>> {
  const supabase = createServiceRoleClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("created_at, input_tokens, output_tokens, cost_sek")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("Failed to get daily usage:", error);
    return [];
  }

  // Group by day
  const byDay: Record<string, { extractions: number; tokens: number; costSek: number }> = {};

  for (const record of data) {
    const date = new Date(record.created_at).toISOString().split("T")[0];
    if (!byDay[date]) {
      byDay[date] = { extractions: 0, tokens: 0, costSek: 0 };
    }
    byDay[date].extractions++;
    byDay[date].tokens += (record.input_tokens || 0) + (record.output_tokens || 0);
    byDay[date].costSek += record.cost_sek || 0;
  }

  return Object.entries(byDay).map(([date, stats]) => ({
    date,
    extractions: stats.extractions,
    tokens: stats.tokens,
    costSek: Math.round(stats.costSek * 100) / 100,
  }));
}
