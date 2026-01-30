import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Paths that don't require setup completion
const PUBLIC_PATHS = [
  "/setup",
  "/api/setup",
  "/api/health",
  "/login",
  "/auth",
  "/_next",
  "/favicon.ico",
];

// Check if path starts with any public path
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths and static assets
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Skip middleware for static files
  if (pathname.includes(".") && !pathname.endsWith(".html")) {
    return NextResponse.next();
  }

  // Check if setup is complete
  const isSetupComplete = await checkSetupStatus();

  if (!isSetupComplete) {
    // Redirect to setup page
    const setupUrl = new URL("/setup", request.url);
    return NextResponse.redirect(setupUrl);
  }

  return NextResponse.next();
}

async function checkSetupStatus(): Promise<boolean> {
  // First check environment variable (pre-configured deployment)
  if (process.env.TENANT_NAME) {
    return true;
  }

  // Check database for setup completion
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Can't check database, assume not configured
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
