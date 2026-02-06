import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getApiUser } from "@/lib/api-auth";
import { encryptAPIKey, decryptAPIKey, generateKeyHint, validateKeyFormat } from "@/lib/encryption";
import { PROVIDERS, AIProvider } from "@/config/models";

// GET /api/user/api-keys - List saved keys (hints only)
export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();
  
  try {
    const { data: keys, error } = await supabase
      .from("user_api_keys")
      .select("id, provider, key_hint, is_valid, created_at, updated_at")
      .eq("user_id", user.id)
      .order("provider");

    if (error) throw error;

    // Build response with provider info
    const providers = Object.values(PROVIDERS).map(provider => {
      const savedKey = keys?.find(k => k.provider === provider.id);
      return {
        provider: provider.id,
        name: provider.name,
        logo: provider.logo,
        apiKeyUrl: provider.apiKeyUrl,
        description: provider.description,
        hasKey: !!savedKey,
        keyHint: savedKey?.key_hint || null,
        isValid: savedKey?.is_valid ?? null,
        savedAt: savedKey?.updated_at || null
      };
    });

    return NextResponse.json({
      success: true,
      providers
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// POST /api/user/api-keys - Save a new API key
export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();
  
  try {
    const body = await request.json();
    const { provider, apiKey } = body;

    // Validate provider
    if (!provider || !['google', 'openai', 'anthropic', 'mistral'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Validate API key format (mistral has no prefix validation, skip format check)
    const formatValidation = provider === 'mistral' 
      ? { isValid: true } as { isValid: boolean; error?: string }
      : validateKeyFormat(apiKey, provider as 'google' | 'openai' | 'anthropic');
    if (!formatValidation.isValid) {
      return NextResponse.json(
        { success: false, error: formatValidation.error },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encryptAPIKey(apiKey);
    const keyHint = generateKeyHint(apiKey);

    // Upsert the key
    const { data, error } = await supabase
      .from("user_api_keys")
      .upsert({
        user_id: user.id,
        provider,
        encrypted_key: encryptedKey,
        key_hint: keyHint,
        is_valid: true, // Will be validated separately
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,provider"
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `${PROVIDERS[provider as AIProvider].name} API key saved successfully`,
      keyHint
    });
  } catch (error) {
    console.error("Error saving API key:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// DELETE /api/user/api-keys - Delete an API key
export async function DELETE(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider || !['google', 'openai', 'anthropic', 'mistral'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `${PROVIDERS[provider as AIProvider].name} API key removed`
    });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
