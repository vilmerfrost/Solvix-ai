/**
 * AI Client Factory with BYOK (Bring Your Own Key) Support
 * 
 * This module provides client instances for all AI providers.
 * It checks if a user has their own API key stored, and falls back
 * to system default keys from environment variables.
 */

import Anthropic from "@anthropic-ai/sdk";
import { Mistral } from "@mistralai/mistralai";
import OpenAI from "openai";
import { createServiceRoleClient } from "@/lib/supabase";
import { decryptAPIKey } from "@/lib/encryption";
import type { AIProvider } from "@/lib/types";

// =============================================================================
// MODEL CONSTANTS
// =============================================================================

export const MODELS = {
  // Quality assessment & Excel extraction (OpenRouter format for Gemini)
  QUALITY_ASSESSMENT: "google/gemini-3-flash-preview",
  EXCEL_EXTRACTION: "google/gemini-3-flash-preview",
  
  // PDF extraction via Mistral (use specific version for OCR, latest for structuring)
  PDF_OCR: "mistral-ocr-2512",
  PDF_STRUCTURING: "mistral-large-latest",
  
  // Verification (always on) - full versioned model ID
  VERIFICATION: "claude-haiku-4-5-20251001",
  
  // Reconciliation (when confidence < 80%) - full versioned model ID
  RECONCILIATION: "claude-sonnet-4-5-20250929",
} as const;

export const THRESHOLDS = {
  RECONCILIATION_TRIGGER: 0.80,
  AUTO_APPROVE_DEFAULT: 80,
  VERIFICATION_BATCH_SIZE: 25,
  EXTRACTION_BATCH_SIZE: 25,
} as const;

// =============================================================================
// SYSTEM-LEVEL CLIENTS (Fallback)
// =============================================================================

export const getSystemAnthropicClient = (): Anthropic => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey });
};

export const getSystemMistralClient = (): Mistral => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is required");
  }
  return new Mistral({ apiKey });
};

export const getSystemOpenRouterClient = (): OpenAI => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
      "X-Title": "Solvix Document Processor",
    },
  });
};

// Native Gemini client (for users with direct Google API key)
export const getSystemGeminiClient = (): OpenAI => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is required");
  }
  return new OpenAI({
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey,
  });
};

// =============================================================================
// BYOK: Get Client for Specific User
// =============================================================================

interface ClientResult<T> {
  client: T;
  isUserKey: boolean;
  provider: AIProvider;
}

/**
 * Get an Anthropic client for a user (BYOK or system fallback)
 */
export async function getAnthropicClientForUser(
  userId: string
): Promise<ClientResult<Anthropic>> {
  const userKey = await getUserApiKey(userId, "anthropic");
  
  if (userKey) {
    return {
      client: new Anthropic({ apiKey: userKey }),
      isUserKey: true,
      provider: "anthropic",
    };
  }
  
  return {
    client: getSystemAnthropicClient(),
    isUserKey: false,
    provider: "anthropic",
  };
}

/**
 * Get a Mistral client for a user (BYOK or system fallback)
 */
export async function getMistralClientForUser(
  userId: string
): Promise<ClientResult<Mistral>> {
  const userKey = await getUserApiKey(userId, "mistral");
  
  if (userKey) {
    return {
      client: new Mistral({ apiKey: userKey }),
      isUserKey: true,
      provider: "mistral",
    };
  }
  
  return {
    client: getSystemMistralClient(),
    isUserKey: false,
    provider: "mistral",
  };
}

/**
 * Get an OpenRouter client for a user (BYOK or system fallback)
 * Used for Gemini via OpenRouter
 */
export async function getOpenRouterClientForUser(
  userId: string
): Promise<ClientResult<OpenAI>> {
  const userKey = await getUserApiKey(userId, "openrouter");
  
  if (userKey) {
    return {
      client: new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: userKey,
        defaultHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
          "X-Title": "Solvix Document Processor",
        },
      }),
      isUserKey: true,
      provider: "openrouter",
    };
  }
  
  return {
    client: getSystemOpenRouterClient(),
    isUserKey: false,
    provider: "openrouter",
  };
}

/**
 * Get a native Gemini client for a user (BYOK or system fallback)
 */
export async function getGeminiClientForUser(
  userId: string
): Promise<ClientResult<OpenAI>> {
  const userKey = await getUserApiKey(userId, "google");
  
  if (userKey) {
    return {
      client: new OpenAI({
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        apiKey: userKey,
      }),
      isUserKey: true,
      provider: "google",
    };
  }
  
  // Fall back to OpenRouter if no native Google key
  try {
    return await getOpenRouterClientForUser(userId);
  } catch {
    // Try system Gemini as last resort
    return {
      client: getSystemGeminiClient(),
      isUserKey: false,
      provider: "google",
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get decrypted API key for a user and provider
 */
async function getUserApiKey(
  userId: string,
  provider: AIProvider
): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    
    // Check user_api_keys table
    const { data: keyData } = await supabase
      .from("user_api_keys")
      .select("encrypted_key, is_valid")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();
    
    if (keyData?.encrypted_key && keyData.is_valid !== false) {
      try {
        return decryptAPIKey(keyData.encrypted_key);
      } catch (e) {
        console.warn(`Failed to decrypt ${provider} API key for user ${userId}`);
        return null;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Track usage for billing
 */
export async function trackUsage(
  userId: string,
  extractionRunId: string | null,
  provider: AIProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  estimatedCostUSD: number
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    
    await supabase.from("model_usage").insert({
      user_id: userId,
      extraction_run_id: extractionRunId,
      provider,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost_usd: estimatedCostUSD.toFixed(6),
    });
  } catch (e) {
    console.error("Failed to track usage:", e);
  }
}

/**
 * Check if user has API key for a provider
 */
export async function hasApiKeyForProvider(
  userId: string,
  provider: AIProvider
): Promise<boolean> {
  const key = await getUserApiKey(userId, provider);
  return key !== null;
}

/**
 * Get all configured providers for a user
 */
export async function getConfiguredProviders(
  userId: string
): Promise<AIProvider[]> {
  const providers: AIProvider[] = ["google", "openai", "anthropic", "mistral", "openrouter"];
  const configured: AIProvider[] = [];
  
  for (const provider of providers) {
    if (await hasApiKeyForProvider(userId, provider)) {
      configured.push(provider);
    }
  }
  
  return configured;
}
