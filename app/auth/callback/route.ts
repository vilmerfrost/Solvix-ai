import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Handle password reset flow
      if (next === "/reset-password") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user already has a subscription
        const { data: existingSubscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        // If no subscription exists, create a 7-day trial
        if (!existingSubscription) {
          const now = new Date();
          const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
          
          await supabase
            .from("subscriptions")
            .insert({
              user_id: user.id,
              plan: "trial",
              status: "trialing",
              trial_start: now.toISOString(),
              trial_end: trialEnd.toISOString(),
            });
          
          console.log(`[Auth] Created 7-day trial for user ${user.id}`);
        }
      }
      
      // Default redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something goes wrong, redirect back to login
  return NextResponse.redirect(`${origin}/login?message=Kunde inte logga in`);
}