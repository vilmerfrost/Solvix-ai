/**
 * Billing Checkout API
 * Creates Stripe checkout sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createCheckoutSession, PlanId } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const body = await request.json();
    const { planId } = body as { planId: PlanId };

    if (!planId || !["starter", "pro", "enterprise"].includes(planId)) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    const checkoutUrl = await createCheckoutSession(
      user.id,
      user.email || "",
      planId
    );

    if (!checkoutUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
