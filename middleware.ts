import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/setup",
  "/api/setup",
  "/api/health",
  "/api/webhooks",
  "/terms",
  "/privacy",
  "/_next",
  "/favicon.ico",
];

// Check if path starts with any public path
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Skip middleware for static files
  if (pathname.includes(".") && !pathname.endsWith(".html")) {
    return NextResponse.next();
  }

  // Create response that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Check for authenticated session
  const { data: { user }, error } = await supabase.auth.getUser();

  // If no user and not on public path, redirect to login
  if (error || !user) {
    const loginUrl = new URL("/login", request.url);
    // Save the original URL to redirect back after login
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated - check if setup is complete
  const isSetupComplete = await checkSetupStatus(supabase);

  if (!isSetupComplete && !pathname.startsWith("/setup")) {
    // Redirect to setup page if not complete
    const setupUrl = new URL("/setup", request.url);
    return NextResponse.redirect(setupUrl);
  }

  // If on setup page but setup is complete, redirect to dashboard
  if (isSetupComplete && pathname.startsWith("/setup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

async function checkSetupStatus(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  // First check environment variable (pre-configured deployment)
  if (process.env.TENANT_NAME) {
    return true;
  }

  try {
    const { data: settings, error } = await supabase
      .from("settings")
      .select("is_setup_complete")
      .eq("user_id", "default")
      .single();

    if (error || !settings) {
      return false;
    }

    return settings.is_setup_complete === true;
  } catch {
    // On error, assume not configured to trigger setup
    return false;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
