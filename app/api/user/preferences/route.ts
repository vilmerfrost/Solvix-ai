import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getApiUser } from "@/lib/api-auth";
import { AVAILABLE_MODELS, getModelById } from "@/config/models";

// GET /api/user/preferences - Get user's model preferences
export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();
  
  try {
    const { data: settings, error } = await supabase
      .from("settings")
      .select("preferred_model, custom_instructions")
      .eq("user_id", user.id)
      .single();

    if (error) throw error;

    // Get model info
    const modelId = settings?.preferred_model || 'gemini-3-flash';
    const model = getModelById(modelId);

    // Get configured providers
    const { data: keys } = await supabase
      .from("user_api_keys")
      .select("provider, is_valid")
      .eq("user_id", user.id);

    const configuredProviders = (keys || [])
      .filter(k => k.is_valid)
      .map(k => k.provider);

    // Mark models as available based on configured providers
    const availableModels = AVAILABLE_MODELS.map(m => ({
      ...m,
      available: configuredProviders.includes(m.provider)
    }));

    return NextResponse.json({
      success: true,
      preferredModel: modelId,
      customInstructions: settings?.custom_instructions || "",
      modelInfo: model,
      configuredProviders,
      availableModels
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// POST /api/user/preferences - Update model preferences
export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();
  
  try {
    const body = await request.json();
    const { preferredModel, customInstructions } = body;

    // Validate model exists
    if (preferredModel) {
      const model = getModelById(preferredModel);
      if (!model) {
        return NextResponse.json(
          { success: false, error: "Invalid model ID" },
          { status: 400 }
        );
      }

      // Check if user has API key for this model's provider
      const { data: keyData } = await supabase
        .from("user_api_keys")
        .select("is_valid")
        .eq("user_id", user.id)
        .eq("provider", model.provider)
        .single();

      if (!keyData || !keyData.is_valid) {
        return NextResponse.json(
          { 
            success: false, 
            error: `No valid API key configured for ${model.provider}. Please add your API key first.` 
          },
          { status: 400 }
        );
      }
    }

    // Update settings
    const updateData: any = {};
    if (preferredModel !== undefined) updateData.preferred_model = preferredModel;
    if (customInstructions !== undefined) updateData.custom_instructions = customInstructions;

    const { error } = await supabase
      .from("settings")
      .update(updateData)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully"
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
