import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * Health check endpoint
 * Returns system status for monitoring
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: "ok" | "error"; latency?: number; message?: string }> = {};

  // Check Supabase connection
  try {
    const supabase = createServiceRoleClient();
    const dbStart = Date.now();
    const { error } = await supabase.from("settings").select("user_id").limit(1);
    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.database = { status: "error", message: (error instanceof Error ? error.message : String(error)) };
    } else {
      checks.database = { status: "ok", latency: dbLatency };
    }
  } catch (error) {
    checks.database = { status: "error", message: (error instanceof Error ? error.message : String(error)) };
  }

  // Check environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const optionalEnvVars = [
    "AZURE_STORAGE_CONNECTION_STRING",
    "STRIPE_SECRET_KEY",
    "RESEND_API_KEY",
    "SENTRY_DSN",
  ];

  const missingRequired = requiredEnvVars.filter((v) => !process.env[v]);
  const configuredOptional = optionalEnvVars.filter((v) => !!process.env[v]);

  checks.environment = {
    status: missingRequired.length === 0 ? "ok" : "error",
    message:
      missingRequired.length > 0
        ? `Missing: ${missingRequired.join(", ")}`
        : `${configuredOptional.length}/${optionalEnvVars.length} optional services configured`,
  };

  // Overall health
  const allChecksOk = Object.values(checks).every((c) => c.status === "ok");
  const totalLatency = Date.now() - startTime;

  return NextResponse.json(
    {
      status: allChecksOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      latency: totalLatency,
      checks,
      services: {
        stripe: !!process.env.STRIPE_SECRET_KEY,
        resend: !!process.env.RESEND_API_KEY,
        sentry: !!process.env.SENTRY_DSN,
        azure: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        posthog: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
      },
    },
    {
      status: allChecksOk ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
