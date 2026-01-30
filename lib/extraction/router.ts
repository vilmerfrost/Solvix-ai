/**
 * Model Router
 * Routes extraction requests to the appropriate provider adapter
 */

import { createServiceRoleClient } from "@/lib/supabase";
import { decryptAPIKey } from "@/lib/encryption";
import { getModelById, getProviderByModelId, AIProvider, AVAILABLE_MODELS } from "@/config/models";
import { ExtractionRequest, ExtractionResult, ExtractionAdapter } from "./types";
import { createGeminiAdapter } from "./adapters/gemini";
import { createOpenAIAdapter } from "./adapters/openai";
import { createAnthropicAdapter } from "./adapters/anthropic";

/**
 * Get the user's preferred model from settings
 */
export async function getUserPreferredModel(userId: string): Promise<string> {
  const supabase = createServiceRoleClient();
  
  const { data: settings } = await supabase
    .from("settings")
    .select("preferred_model")
    .eq("user_id", userId)
    .single();
  
  return settings?.preferred_model || 'gemini-3-flash';
}

/**
 * Get the user's custom instructions from settings
 */
export async function getUserCustomInstructions(userId: string): Promise<string | undefined> {
  const supabase = createServiceRoleClient();
  
  const { data: settings } = await supabase
    .from("settings")
    .select("custom_instructions")
    .eq("user_id", userId)
    .single();
  
  return settings?.custom_instructions || undefined;
}

/**
 * Get the decrypted API key for a provider
 */
export async function getAPIKeyForProvider(provider: AIProvider, userId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  
  const { data: keyData } = await supabase
    .from("user_api_keys")
    .select("encrypted_key, is_valid")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  
  if (!keyData || !keyData.is_valid) {
    return null;
  }
  
  try {
    return decryptAPIKey(keyData.encrypted_key);
  } catch {
    return null;
  }
}

/**
 * Get the API key for a specific model
 */
export async function getAPIKeyForModel(modelId: string, userId: string): Promise<string | null> {
  const provider = getProviderByModelId(modelId);
  if (!provider) return null;
  
  return getAPIKeyForProvider(provider, userId);
}

/**
 * Check which providers have valid API keys configured
 */
export async function getConfiguredProviders(userId: string): Promise<AIProvider[]> {
  const supabase = createServiceRoleClient();
  
  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider")
    .eq("user_id", userId)
    .eq("is_valid", true);
  
  return (keys || []).map(k => k.provider as AIProvider);
}

/**
 * Get available models based on configured API keys
 */
export async function getAvailableModels(userId: string): Promise<typeof AVAILABLE_MODELS> {
  const configuredProviders = await getConfiguredProviders(userId);
  
  return AVAILABLE_MODELS.map(model => ({
    ...model,
    // Mark as unavailable if provider not configured
    available: configuredProviders.includes(model.provider)
  }));
}

/**
 * Create an adapter for the specified model
 */
function createAdapter(modelId: string): ExtractionAdapter {
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  
  switch (model.provider) {
    case 'google':
      return createGeminiAdapter(modelId);
    case 'openai':
      return createOpenAIAdapter(modelId);
    case 'anthropic':
      return createAnthropicAdapter(modelId);
    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}

/**
 * Main extraction function that routes to the correct adapter
 */
export async function extractWithModel(
  request: ExtractionRequest,
  userId: string,
  modelId?: string
): Promise<ExtractionResult> {
  // Get model ID from request or user preferences
  const actualModelId = modelId || await getUserPreferredModel(userId);
  
  // Validate the model exists
  const model = getModelById(actualModelId);
  if (!model) {
    return {
      success: false,
      items: [],
      model: actualModelId,
      provider: 'unknown',
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: `Unknown model: ${actualModelId}`
    };
  }
  
  // Get API key for this model's provider
  const apiKey = await getAPIKeyForModel(actualModelId, userId);
  if (!apiKey) {
    return {
      success: false,
      items: [],
      model: actualModelId,
      provider: model.provider,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: `No API key configured for ${model.provider}. Please add your API key in Settings.`
    };
  }
  
  // Add custom instructions if not provided
  if (!request.customInstructions) {
    request.customInstructions = await getUserCustomInstructions(userId);
  }
  
  // Create the appropriate adapter and extract
  try {
    const adapter = createAdapter(actualModelId);
    return await adapter.extract(request, apiKey);
  } catch (error: any) {
    return {
      success: false,
      items: [],
      model: actualModelId,
      provider: model.provider,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: error.message || 'Extraction failed'
    };
  }
}

/**
 * Extract with a specific API key (for testing or one-off requests)
 */
export async function extractWithAPIKey(
  request: ExtractionRequest,
  modelId: string,
  apiKey: string
): Promise<ExtractionResult> {
  const model = getModelById(modelId);
  if (!model) {
    return {
      success: false,
      items: [],
      model: modelId,
      provider: 'unknown',
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: `Unknown model: ${modelId}`
    };
  }
  
  try {
    const adapter = createAdapter(modelId);
    return await adapter.extract(request, apiKey);
  } catch (error: any) {
    return {
      success: false,
      items: [],
      model: modelId,
      provider: model.provider,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: error.message || 'Extraction failed'
    };
  }
}

/**
 * Update user's preferred model
 */
export async function setPreferredModel(modelId: string, userId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  
  await supabase
    .from("settings")
    .update({ preferred_model: modelId })
    .eq("user_id", userId);
}

/**
 * Update user's custom instructions
 */
export async function setCustomInstructions(instructions: string | null, userId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  
  await supabase
    .from("settings")
    .update({ custom_instructions: instructions })
    .eq("user_id", userId);
}
