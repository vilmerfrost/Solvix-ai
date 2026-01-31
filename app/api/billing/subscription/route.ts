/**
 * Subscription API
 * Returns user's subscription information
 */

import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { getSubscription } from "@/lib/stripe";

export async function GET() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const subscription = await getSubscription(user.id);

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
