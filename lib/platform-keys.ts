/**
 * Platform Managed Keys
 * Provides fallback API keys for users without BYOK configuration.
 * Keys are stored as environment variables on the server.
 */

import { AIProvider } from "@/config/models";

/**
 * Check if platform-managed keys are available for a given provider
 */
export function hasPlatformKey(provider: AIProvider): boolean {
  switch (provider) {
    case 'google':
      return !!process.env.PLATFORM_GOOGLE_API_KEY;
    case 'openai':
      return !!process.env.PLATFORM_OPENAI_API_KEY;
    case 'anthropic':
      return !!process.env.PLATFORM_ANTHROPIC_API_KEY;
    case 'mistral':
      return !!process.env.PLATFORM_MISTRAL_API_KEY;
    default:
      return false;
  }
}

/**
 * Get the platform API key for a provider
 * ONLY call this server-side — never expose to client
 */
export function getPlatformKey(provider: AIProvider): string | null {
  switch (provider) {
    case 'google':
      return process.env.PLATFORM_GOOGLE_API_KEY || null;
    case 'openai':
      return process.env.PLATFORM_OPENAI_API_KEY || null;
    case 'anthropic':
      return process.env.PLATFORM_ANTHROPIC_API_KEY || null;
    case 'mistral':
      return process.env.PLATFORM_MISTRAL_API_KEY || null;
    default:
      return null;
  }
}

/**
 * Get the default model ID for managed-key users
 */
export function getPlatformDefaultModel(): string {
  return process.env.PLATFORM_DEFAULT_MODEL || 'gemini-3-flash';
}

/**
 * Check if a user is eligible for managed keys
 * Currently: any authenticated user can use managed keys
 * Future: check subscription status, trial period, usage limits
 */
export async function isEligibleForManagedKeys(userId: string): Promise<boolean> {
  // TODO: Check subscription status from Stripe
  // TODO: Check if user is within free trial period
  // TODO: Check usage limits (e.g., 50 free documents)
  
  // For now: all authenticated users can use managed keys
  return !!userId && userId !== 'default';
}

/**
 * Track platform key usage for cost monitoring
 * Call this after every extraction that uses a platform key
 */
export async function trackPlatformKeyUsage(
  userId: string,
  provider: AIProvider,
  model: string,
  tokensUsed: { input: number; output: number },
  cost: number
): Promise<void> {
  // Log for now — implement proper tracking later
  console.log(`[PLATFORM KEY] User ${userId} used ${provider}/${model} — cost: $${cost.toFixed(4)}, tokens: ${tokensUsed.input}in/${tokensUsed.output}out`);

  // TODO: Insert into a platform_usage_tracking table
  // TODO: Check against usage limits
  // TODO: Alert if costs exceed threshold
}

/**
 * Check if any platform keys are configured at all
 */
export function hasPlatformKeysConfigured(): boolean {
  return (
    !!process.env.PLATFORM_GOOGLE_API_KEY ||
    !!process.env.PLATFORM_OPENAI_API_KEY ||
    !!process.env.PLATFORM_ANTHROPIC_API_KEY ||
    !!process.env.PLATFORM_MISTRAL_API_KEY
  );
}
