/**
 * Billing Portal API
 * Creates Stripe customer portal sessions
 */

import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const portalUrl = await createBillingPortalSession(user.id);

    if (!portalUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to create portal session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url: portalUrl });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
