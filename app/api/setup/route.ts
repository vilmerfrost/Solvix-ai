import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getApiUser } from "@/lib/api-auth";

interface SetupRequest {
  companyName: string;
  companySlug: string;
  companyLogo?: string;
  primaryColor: string;
  language: "sv" | "en" | "no" | "fi";
}

// POST /api/setup - Complete initial setup
export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();

  try {
    const body: SetupRequest = await request.json();
    const { companyName, companySlug, companyLogo, primaryColor, language } = body;

    // Validate required fields
    if (!companyName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Company name is required" },
        { status: 400 }
      );
    }

    // Validate color format
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (primaryColor && !colorRegex.test(primaryColor)) {
      return NextResponse.json(
        { success: false, error: "Invalid color format. Use hex format (e.g., #3B82F6)" },
        { status: 400 }
      );
    }

    // Validate language
    const validLanguages = ["sv", "en", "no", "fi"];
    if (language && !validLanguages.includes(language)) {
      return NextResponse.json(
        { success: false, error: "Invalid language. Must be one of: sv, en, no, fi" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const slug = companySlug?.trim() || companyName
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/[ö]/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Update or insert settings for this user
    const { data, error } = await supabase
      .from("settings")
      .upsert({
        user_id: user.id,
        company_name: companyName.trim(),
        company_slug: slug,
        company_logo_url: companyLogo?.trim() || null,
        primary_color: primaryColor || "#3B82F6",
        language: language || "sv",
        is_setup_complete: true,
      }, {
        onConflict: "user_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Setup error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Setup complete!",
      settings: data,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.error("Setup failed:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) || "Setup failed" },
      { status: 500 }
    );
  }
}

// GET /api/setup - Check setup status
export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    // Check if pre-configured via environment
    if (process.env.TENANT_NAME) {
      return NextResponse.json({
        success: true,
        isSetupComplete: true,
        source: "environment",
      });
    }

    // Check database
    const { data: settings, error } = await supabase
      .from("settings")
      .select("is_setup_complete, company_name")
      .eq("user_id", "default")
      .single();

    if (error) {
      // No settings row yet - not configured
      return NextResponse.json({
        success: true,
        isSetupComplete: false,
        source: "database",
      });
    }

    return NextResponse.json({
      success: true,
      isSetupComplete: settings.is_setup_complete === true,
      companyName: settings.company_name,
      source: "database",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
