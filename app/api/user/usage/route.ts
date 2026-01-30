/**
 * Usage API
 * Returns usage statistics for the current user
 */

import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { getCurrentMonthUsage, getUsageByModel, getDailyUsage } from "@/lib/usage-tracking";

// GET: Get usage statistics
export async function GET() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    // Get all usage data in parallel
    const [monthlyUsage, usageByModel, dailyUsage] = await Promise.all([
      getCurrentMonthUsage(user.id),
      getUsageByModel(user.id),
      getDailyUsage(user.id, 30),
    ]);

    return NextResponse.json({
      success: true,
      monthly: monthlyUsage,
      byModel: usageByModel,
      daily: dailyUsage,
    });
  } catch (error: any) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
