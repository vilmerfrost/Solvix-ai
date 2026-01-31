/**
 * API Route Authentication Helper
 * Use this to get authenticated user in API routes
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: NextResponse | null;
}

/**
 * Get authenticated user from API route
 * Returns user object or error response
 */
export async function getApiUser(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in API routes
            }
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    return {
      user: { id: user.id, email: user.email },
      error: null,
    };
  } catch (err) {
    console.error("Auth error in API route:", err);
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: "Authentication error" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require authenticated user - returns userId or throws error response
 */
export async function requireApiAuth(): Promise<string> {
  const { user, error } = await getApiUser();
  
  if (error || !user) {
    throw error || NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  return user.id;
}

/**
 * Helper to wrap API routes with auth check
 * Usage: export const GET = withAuth(async (userId) => { ... })
 */
export function withAuth<T>(
  handler: (userId: string, ...args: unknown[]) => Promise<NextResponse>
) {
  return async (...args: unknown[]): Promise<NextResponse> => {
    const { user, error } = await getApiUser();
    
    if (error || !user) {
      return error || NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    return handler(user.id, ...args);
  };
}
