/**
 * Safe Supabase browser client for use in client components
 * Handles missing environment variables gracefully during build/SSR
 */

import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase browser client
 * Safe to call during SSR/build - returns null if env vars are missing
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  // Only create client on client-side
  if (typeof window === "undefined") {
    return null;
  }

  // Return cached client if exists
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn("Supabase environment variables not configured");
    return null;
  }

  supabaseClient = createBrowserClient(url, anonKey);
  return supabaseClient;
}

/**
 * Create a new Supabase browser client
 * Throws error if env vars are missing - use only when you're sure env vars exist
 */
export function createSafeSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(url, anonKey);
}
