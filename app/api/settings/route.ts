import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getApiUser } from "@/lib/api-auth";

// Default settings
const DEFAULT_SETTINGS = {
  auto_approve_threshold: 80,
  enterprise_auto_approve: false,
  material_synonyms: {
    "Trä": ["Brädor", "Virke", "Lastpall", "Spont"],
    "Gips": ["Gipsskivor", "Rivningsgips", "Gipsspill"],
    "Betong": ["Armerad betong", "Betongkross"],
    "Brännbart": ["Restavfall", "Blandat brännbart"]
  },
  // Verification settings (anti-hallucination)
  enable_verification: false, // Off by default to save API costs
  verification_confidence_threshold: 0.85, // Verify if extraction confidence < 85%
  // Azure folder settings - empty by default, user must configure
  // Format: [{ container: "arrivalwastedata", folder: "output/subfolder", enabled: true }]
  azure_input_folders: [],
  azure_output_folder: "completed"
};

// GET /api/settings - Fetch current settings
export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();

  try {
    // Try to get existing settings
    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If no settings exist for this user, create default settings
    if (error && error.code === "PGRST116") {
      // No rows found - create settings for this user
      const { data: newSettings, error: insertError } = await supabase
        .from("settings")
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create settings for user:", insertError);
        throw insertError;
      }

      const azureContainerName = process.env.AZURE_CONTAINER_NAME || null;

      return NextResponse.json({
        success: true,
        settings: {
          ...DEFAULT_SETTINGS,
          ...newSettings
        },
        azureContainerName,
        isNewUser: true
      });
    }

    if (error) throw error;

    // Include Azure container name from environment
    const azureContainerName = process.env.AZURE_CONTAINER_NAME || null;

    return NextResponse.json({
      success: true,
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings
      },
      // Include env-based config for UI display
      azureContainerName,
    });
  } catch (error: any) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update settings
export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();

  try {
    const body = await request.json();
    const { 
      auto_approve_threshold, 
      enterprise_auto_approve, 
      material_synonyms,
      enable_verification,
      verification_confidence_threshold,
      azure_input_folders,
      azure_output_folder
    } = body;

    // Validate threshold
    if (auto_approve_threshold !== undefined) {
      if (auto_approve_threshold < 60 || auto_approve_threshold > 99) {
        return NextResponse.json(
          { success: false, error: "Threshold must be between 60% and 99%" },
          { status: 400 }
        );
      }
    }

    // Validate verification confidence threshold
    if (verification_confidence_threshold !== undefined) {
      if (verification_confidence_threshold < 0.5 || verification_confidence_threshold > 1.0) {
        return NextResponse.json(
          { success: false, error: "Verification threshold must be between 50% and 100%" },
          { status: 400 }
        );
      }
    }

    // Validate azure_input_folders if provided
    if (azure_input_folders !== undefined) {
      if (!Array.isArray(azure_input_folders)) {
        return NextResponse.json(
          { success: false, error: "azure_input_folders must be an array" },
          { status: 400 }
        );
      }
    }

    // Build update payload
    const updatePayload = {
      ...(auto_approve_threshold !== undefined && { auto_approve_threshold }),
      ...(enterprise_auto_approve !== undefined && { enterprise_auto_approve }),
      ...(material_synonyms !== undefined && { material_synonyms }),
      ...(enable_verification !== undefined && { enable_verification }),
      ...(verification_confidence_threshold !== undefined && { verification_confidence_threshold }),
      ...(azure_input_folders !== undefined && { azure_input_folders }),
      ...(azure_output_folder !== undefined && { azure_output_folder })
    };

    // Use upsert to handle case where settings row doesn't exist yet
    const { data, error } = await supabase
      .from("settings")
      .upsert({
        user_id: user.id,
        ...DEFAULT_SETTINGS,
        ...updatePayload
      }, {
        onConflict: "user_id"
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      settings: data,
      message: "Inställningar uppdaterade!"
    });
  } catch (error: any) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

