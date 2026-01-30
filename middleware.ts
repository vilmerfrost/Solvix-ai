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
  "/api/cron",
  "/terms",
  "/privacy",
  "/pricing",
  "/health",
  "/subscription-required",
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

  // User is authenticated - for multi-tenant mode, skip setup check
  // Setup is only needed for whitelabel/self-hosted deployments
  const isWhitelabelSetup = process.env.TENANT_NAME || process.env.WHITELABEL_MODE !== "true";
  
  // If whitelabel mode requires setup, check it
  if (process.env.WHITELABEL_MODE === "true" && !process.env.TENANT_NAME) {
    const isSetupComplete = await checkSetupStatus(supabase);

    if (!isSetupComplete && !pathname.startsWith("/setup")) {
      const setupUrl = new URL("/setup", request.url);
      return NextResponse.redirect(setupUrl);
    }

    if (isSetupComplete && pathname.startsWith("/setup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // For SaaS mode, always redirect from /setup to /dashboard
  if (pathname.startsWith("/setup") && !process.env.WHITELABEL_MODE) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check subscription status for SaaS mode
  if (!process.env.WHITELABEL_MODE) {
    const isSubscribed = await checkSubscriptionStatus(supabase, user.id);
    
    if (!isSubscribed && !pathname.startsWith("/subscription-required") && !pathname.startsWith("/pricing") && !pathname.startsWith("/settings/billing")) {
      return NextResponse.redirect(new URL("/subscription-required", request.url));
    }
  }

  return response;
}

async function checkSetupStatus(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  // Check environment variable (pre-configured deployment)
  if (process.env.TENANT_NAME) {
    return true;
  }

  try {
    // For whitelabel mode, check the 'default' user settings
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
    return false;
  }
}

async function checkSubscriptionStatus(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<boolean> {
  try {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("status, trial_end, plan")
      .eq("user_id", userId)
      .single();

    if (error || !subscription) {
      // No subscription found - not subscribed
      return false;
    }

    // Check if subscription is active
    if (subscription.status === "active" || subscription.status === "lifetime") {
      return true;
    }

    // Check if trial is still valid
    if (subscription.status === "trialing" && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      if (trialEnd > new Date()) {
        return true;
      }
    }

    return false;
  } catch {
    // If check fails, allow access (fail open for better UX)
    return true;
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
