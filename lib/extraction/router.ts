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
import { createMistralAdapter } from "./adapters/mistral";

/**
 * Get the user's preferred model from settings
 * Falls back to platform default when user has no preference
 */
export async function getUserPreferredModel(userId: string): Promise<string> {
  const supabase = createServiceRoleClient();
  
  const { data: settings } = await supabase
    .from("settings")
    .select("preferred_model")
    .eq("user_id", userId)
    .single();
  
  if (settings?.preferred_model) {
    return settings.preferred_model;
  }
  
  // Fall back to platform default model
  const { getPlatformDefaultModel } = await import("@/lib/platform-keys");
  return getPlatformDefaultModel();
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
 * Priority: 1) User's own BYOK key, 2) Platform managed key (if eligible)
 */
export async function getAPIKeyForProvider(provider: AIProvider, userId: string): Promise<string | null> {
  // Priority 1: Check for user's own BYOK key
  const supabase = createServiceRoleClient();
  
  const { data: keyData } = await supabase
    .from("user_api_keys")
    .select("encrypted_key, is_valid")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  
  if (keyData?.is_valid && keyData.encrypted_key) {
    try {
      const decrypted = decryptAPIKey(keyData.encrypted_key);
      if (decrypted) return decrypted;
    } catch {
      // Fall through to platform key
    }
  }
  
  // Priority 2: Check for platform managed key
  const { hasPlatformKey, getPlatformKey, isEligibleForManagedKeys } = await import("@/lib/platform-keys");
  
  if (hasPlatformKey(provider)) {
    const eligible = await isEligibleForManagedKeys(userId);
    if (eligible) {
      return getPlatformKey(provider);
    }
  }
  
  return null;
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
 * Includes both BYOK keys and platform-managed keys
 */
export async function getConfiguredProviders(userId: string): Promise<AIProvider[]> {
  const supabase = createServiceRoleClient();
  
  // Get user's own keys
  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider")
    .eq("user_id", userId)
    .eq("is_valid", true);
  
  const userProviders = (keys || []).map(k => k.provider as AIProvider);
  
  // Add platform-managed providers
  const { hasPlatformKey, isEligibleForManagedKeys } = await import("@/lib/platform-keys");
  const eligible = await isEligibleForManagedKeys(userId);
  
  if (eligible) {
    const allProviders: AIProvider[] = ['google', 'openai', 'anthropic', 'mistral'];
    for (const provider of allProviders) {
      if (hasPlatformKey(provider) && !userProviders.includes(provider)) {
        userProviders.push(provider);
      }
    }
  }
  
  return userProviders;
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
    case 'mistral':
      return createMistralAdapter(modelId);
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
    const result = await adapter.extract(request, apiKey);
    
    // Track platform key usage if this was a managed key
    const { getPlatformKey, trackPlatformKeyUsage } = await import("@/lib/platform-keys");
    const platformKey = getPlatformKey(model.provider);
    if (platformKey && apiKey === platformKey && result.success) {
      await trackPlatformKeyUsage(
        userId,
        model.provider,
        actualModelId,
        result.tokensUsed,
        result.cost
      ).catch(err => console.error('[PLATFORM KEY] Tracking failed:', err));
    }
    
    // Enrich with Swedish metadata if raw response available
    if (result.success && result.rawResponse) {
      try {
        const { detectSwedishFormats } = await import("@/lib/swedish-formats");
        const meta = detectSwedishFormats(result.rawResponse);
        result.swedishMetadata = {
          orgNr: meta.orgNr.length > 0 ? meta.orgNr : undefined,
          plusgiro: meta.plusgiro.length > 0 ? meta.plusgiro : undefined,
          bankgiro: meta.bankgiro.length > 0 ? meta.bankgiro : undefined,
          ocrReferences: meta.ocrReferences.length > 0 ? meta.ocrReferences : undefined,
          vatNumbers: meta.vatNumbers.length > 0 ? meta.vatNumbers : undefined,
          vatRate: meta.vatInfo.rate,
          vatAmount: meta.vatInfo.amount,
        };
      } catch (err) {
        console.warn("[Swedish Formats] Detection failed:", err);
      }
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      items: [],
      model: actualModelId,
      provider: model.provider,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: error instanceof Error ? error.message : 'Extraction failed'
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
  } catch (error) {
    return {
      success: false,
      items: [],
      model: modelId,
      provider: model.provider,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Extraction failed'
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

// ============================================================================
// ROBUST EXTRACTION WITH RETRY & FALLBACK
// ============================================================================

interface ExtractOptions {
  maxRetries?: number;
  fallbackToOtherProviders?: boolean;
  onLog?: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
}

interface ErrorDetail {
  provider: string;
  model: string;
  error: string;
  errorType: 'api_key' | 'rate_limit' | 'server_error' | 'timeout' | 'invalid_response' | 'unknown';
  timestamp: string;
}

/**
 * Classify error type for better user feedback
 */
function classifyError(error: unknown): ErrorDetail['errorType'] {
  const message = (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)).toLowerCase();
  
  if (message.includes('api key') || message.includes('authentication') || message.includes('unauthorized') || message.includes('invalid key') || message.includes('api_key')) {
    return 'api_key';
  }
  if (message.includes('rate limit') || message.includes('quota') || message.includes('too many requests') || message.includes('429')) {
    return 'rate_limit';
  }
  if (message.includes('timeout') || message.includes('timed out') || message.includes('deadline')) {
    return 'timeout';
  }
  if (message.includes('server') || message.includes('500') || message.includes('503') || message.includes('502') || message.includes('internal')) {
    return 'server_error';
  }
  if (message.includes('json') || message.includes('parse') || message.includes('invalid response')) {
    return 'invalid_response';
  }
  
  return 'unknown';
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(errorType: ErrorDetail['errorType'], provider: string): string {
  switch (errorType) {
    case 'api_key':
      return `Invalid or missing API key for ${provider}. Please check your API key in Settings → API Keys.`;
    case 'rate_limit':
      return `Rate limit exceeded for ${provider}. Please wait a moment and try again, or use a different model.`;
    case 'server_error':
      return `${provider} server is experiencing issues. Try again later or use a different model.`;
    case 'timeout':
      return `Request timed out. The document may be too large. Try a faster model or split the document.`;
    case 'invalid_response':
      return `Failed to parse response from ${provider}. The document format may be unsupported.`;
    default:
      return `An error occurred with ${provider}. Please try again or use a different model.`;
  }
}

/**
 * Model fallback order based on cost/speed tradeoffs
 */
const FALLBACK_ORDER: Record<AIProvider, AIProvider[]> = {
  'anthropic': ['google', 'mistral', 'openai'],
  'google': ['mistral', 'anthropic', 'openai'],
  'openai': ['google', 'mistral', 'anthropic'],
  'mistral': ['google', 'anthropic', 'openai'],
};

/**
 * Get default model for a provider
 */
function getDefaultModelForProvider(provider: AIProvider): string {
  switch (provider) {
    case 'google': return 'gemini-3-flash';
    case 'anthropic': return 'claude-haiku-4.5';
    case 'openai': return 'gpt-5.2-chat';
    case 'mistral': return 'pixtral-large';
    default: return 'gemini-3-flash';
  }
}

/**
 * Robust extraction with automatic retry and provider fallback
 */
export async function extractWithRetryAndFallback(
  request: ExtractionRequest,
  userId: string,
  modelId?: string,
  options: ExtractOptions = {}
): Promise<ExtractionResult & { attempts: ErrorDetail[] }> {
  const { maxRetries = 2, fallbackToOtherProviders = true, onLog } = options;
  const log = onLog || ((msg: string) => console.log(msg));
  
  const attempts: ErrorDetail[] = [];
  
  // Get starting model
  const startingModelId = modelId || await getUserPreferredModel(userId);
  const startingModel = getModelById(startingModelId);
  
  if (!startingModel) {
    return {
      success: false,
      items: [],
      model: startingModelId,
      provider: 'unknown',
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: `Unknown model: ${startingModelId}`,
      attempts
    };
  }
  
  // Get all configured providers
  const configuredProviders = await getConfiguredProviders(userId);
  
  if (configuredProviders.length === 0) {
    return {
      success: false,
      items: [],
      model: startingModelId,
      provider: startingModel.provider,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: 'No API keys configured. Please add an API key in Settings → API Keys.',
      attempts
    };
  }
  
  // Build list of models to try
  const modelsToTry: { modelId: string; provider: AIProvider }[] = [];
  
  // First, try the requested model if its provider is configured
  if (configuredProviders.includes(startingModel.provider)) {
    modelsToTry.push({ modelId: startingModelId, provider: startingModel.provider });
  }
  
  // Then add fallback providers
  if (fallbackToOtherProviders) {
    const fallbackProviders = FALLBACK_ORDER[startingModel.provider] || [];
    for (const fallbackProvider of fallbackProviders) {
      if (configuredProviders.includes(fallbackProvider)) {
        const fallbackModelId = getDefaultModelForProvider(fallbackProvider);
        // Avoid duplicates
        if (!modelsToTry.some(m => m.modelId === fallbackModelId)) {
          modelsToTry.push({ modelId: fallbackModelId, provider: fallbackProvider });
        }
      }
    }
  }
  
  if (modelsToTry.length === 0) {
    return {
      success: false,
      items: [],
      model: startingModelId,
      provider: startingModel.provider,
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      processingTimeMs: 0,
      error: `No API key configured for ${startingModel.provider}. Please add your API key in Settings.`,
      attempts
    };
  }
  
  // Try each model with retries
  for (const { modelId: currentModelId, provider } of modelsToTry) {
    log(`🔄 Trying ${provider} (${currentModelId})...`, 'info');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await extractWithModel(request, userId, currentModelId);
        
        if (result.success) {
          if (attempts.length > 0) {
            log(`✅ Success with ${provider} after ${attempts.length} failed attempt(s)`, 'success');
          }
          return { ...result, attempts };
        }
        
        // Extraction returned but with error
        const errorType = classifyError({ message: result.error });
        attempts.push({
          provider,
          model: currentModelId,
          error: result.error || 'Unknown error',
          errorType,
          timestamp: new Date().toISOString()
        });
        
        log(`⚠️ ${provider} failed (attempt ${attempt}/${maxRetries}): ${result.error}`, 'warning');
        
        // Don't retry API key errors - they won't fix themselves
        if (errorType === 'api_key') {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitMs = 1000 * Math.pow(2, attempt - 1);
          log(`   Waiting ${waitMs}ms before retry...`, 'info');
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
        const errorType = classifyError(error);
        attempts.push({
          provider,
          model: currentModelId,
          error: errorMessage,
          errorType,
          timestamp: new Date().toISOString()
        });
        
        log(`❌ ${provider} error (attempt ${attempt}/${maxRetries}): ${errorMessage}`, 'error');
        
        // Don't retry API key errors
        if (errorType === 'api_key') {
          break;
        }
        
        // Wait before retry
        if (attempt < maxRetries) {
          const waitMs = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      }
    }
    
    // Log fallback attempt
    const remainingModels = modelsToTry.slice(modelsToTry.findIndex(m => m.modelId === currentModelId) + 1);
    if (remainingModels.length > 0) {
      log(`🔀 Falling back to ${remainingModels[0].provider}...`, 'info');
    }
  }
  
  // All attempts failed
  const lastAttempt = attempts[attempts.length - 1];
  const userFriendlyError = lastAttempt 
    ? getErrorMessage(lastAttempt.errorType, lastAttempt.provider)
    : 'All extraction attempts failed. Please check your API keys and try again.';
  
  return {
    success: false,
    items: [],
    model: startingModelId,
    provider: startingModel.provider,
    tokensUsed: { input: 0, output: 0 },
    cost: 0,
    processingTimeMs: 0,
    error: userFriendlyError,
    attempts
  };
}
