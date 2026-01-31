/**
 * User Data Export API
 * GDPR compliant data export (dataportabilitet)
 */

import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const supabase = createServiceRoleClient();

    // Fetch all user data in parallel
    const [
      { data: settings },
      { data: documents },
      { data: apiKeys },
      { data: azureConnections },
      { data: usageRecords },
      { data: subscription },
    ] = await Promise.all([
      supabase.from("settings").select("*").eq("user_id", user.id).single(),
      supabase.from("documents").select("*").eq("user_id", user.id),
      supabase
        .from("user_api_keys")
        .select("id, provider, key_hint, is_valid, created_at, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("azure_connections")
        .select("id, connection_name, connection_hint, default_container, is_active, created_at, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
    ]);

    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,

      // Account settings
      settings: settings
        ? {
            companyName: settings.company_name,
            companySlug: settings.company_slug,
            language: settings.language,
            preferredModel: settings.preferred_model,
            autoApproveThreshold: settings.auto_approve_threshold,
            createdAt: settings.created_at,
          }
        : null,

      // Subscription
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
          }
        : null,

      // Documents (summary, not full extracted data for privacy)
      documents: (documents || []).map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      })),

      // API key configurations (hints only, not actual keys)
      apiKeys: (apiKeys || []).map((key) => ({
        provider: key.provider,
        keyHint: key.key_hint,
        isValid: key.is_valid,
        createdAt: key.created_at,
      })),

      // Azure connections (hints only, not actual connection strings)
      azureConnections: (azureConnections || []).map((conn) => ({
        name: conn.connection_name,
        connectionHint: conn.connection_hint,
        defaultContainer: conn.default_container,
        isActive: conn.is_active,
        createdAt: conn.created_at,
      })),

      // Usage statistics
      usage: {
        totalRecords: usageRecords?.length || 0,
        records: (usageRecords || []).map((record) => ({
          modelId: record.model_id,
          inputTokens: record.input_tokens,
          outputTokens: record.output_tokens,
          costSek: record.cost_sek,
          success: record.success,
          createdAt: record.created_at,
        })),
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
