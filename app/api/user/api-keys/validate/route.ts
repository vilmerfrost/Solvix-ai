import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { decryptAPIKey } from "@/lib/encryption";
import { AIProvider, PROVIDERS } from "@/config/models";

// POST /api/user/api-keys/validate - Test if an API key works
export async function POST(request: Request) {
  const supabase = createServiceRoleClient();
  
  try {
    const body = await request.json();
    const { provider } = body;

    if (!provider || !['google', 'openai', 'anthropic'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Fetch the encrypted key
    const { data: keyData, error: fetchError } = await supabase
      .from("user_api_keys")
      .select("encrypted_key")
      .eq("user_id", "default")
      .eq("provider", provider)
      .single();

    if (fetchError || !keyData) {
      return NextResponse.json(
        { success: false, error: "No API key found for this provider" },
        { status: 404 }
      );
    }

    // Decrypt the key
    const apiKey = decryptAPIKey(keyData.encrypted_key);

    // Test the key with a minimal API call
    let isValid = false;
    let errorMessage = "";

    try {
      switch (provider as AIProvider) {
        case 'google':
          isValid = await testGoogleKey(apiKey);
          break;
        case 'openai':
          isValid = await testOpenAIKey(apiKey);
          break;
        case 'anthropic':
          isValid = await testAnthropicKey(apiKey);
          break;
      }
    } catch (e: any) {
      errorMessage = e.message || "Validation failed";
    }

    // Update the is_valid status in the database
    await supabase
      .from("user_api_keys")
      .update({ is_valid: isValid })
      .eq("user_id", "default")
      .eq("provider", provider);

    if (isValid) {
      return NextResponse.json({
        success: true,
        isValid: true,
        message: `${PROVIDERS[provider as AIProvider].name} API key is valid!`
      });
    } else {
      return NextResponse.json({
        success: true,
        isValid: false,
        error: errorMessage || "API key validation failed"
      });
    }
  } catch (error: any) {
    console.error("Error validating API key:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Test Google Gemini API key
async function testGoogleKey(apiKey: string): Promise<boolean> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { method: 'GET' }
  );
  return response.ok;
}

// Test OpenAI API key
async function testOpenAIKey(apiKey: string): Promise<boolean> {
  const response = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  return response.ok;
}

// Test Anthropic API key
async function testAnthropicKey(apiKey: string): Promise<boolean> {
  // Anthropic doesn't have a simple models endpoint, so we make a minimal message request
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }]
    })
  });
  
  // 200 = valid, 401 = invalid key, other = some error but key format is ok
  return response.status !== 401;
}
