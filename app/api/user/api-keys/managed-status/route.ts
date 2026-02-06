import { NextResponse } from "next/server";
import { hasPlatformKeysConfigured } from "@/lib/platform-keys";

/**
 * Check if platform managed keys are available
 * Used by the API keys settings page to show the banner
 */
export async function GET() {
  return NextResponse.json({
    hasManagedKeys: hasPlatformKeysConfigured(),
  });
}
