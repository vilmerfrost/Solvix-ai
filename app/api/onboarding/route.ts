import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerComponentClient } from "@/lib/supabase";
import { getDefaultFeatures } from "@/config/industries";

export async function POST(request: NextRequest) {
  try {
    // Verify the authenticated user server-side
    const authSupabase = await createServerComponentClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { industry } = await request.json();

    if (!industry) {
      return NextResponse.json({ error: "Missing industry" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const features = getDefaultFeatures(industry);

    // Upsert settings with industry and features
    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: user.id,
          industry,
          onboarding_complete: true,
          features_enabled: features,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Failed to save onboarding:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true, industry, features });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
