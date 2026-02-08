"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Sparkles, ArrowRight, CreditCard, LogOut } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface SubscriptionInfo {
  plan: string;
  status: string;
  trialEnd: string | null;
}

export default function SubscriptionRequiredPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from("subscriptions")
          .select("plan, status, trial_end")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setSubscription({
            plan: data.plan,
            status: data.status,
            trialEnd: data.trial_end,
          });

          if (data.trial_end) {
            const endDate = new Date(data.trial_end);
            const now = new Date();
            const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setDaysRemaining(diff);
          }
        }
      }
      
      setLoading(false);
    }

    fetchSubscription();
  }, []);

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isTrialExpired = subscription?.status === "trialing" && daysRemaining !== null && daysRemaining <= 0;
  const isCanceled = subscription?.status === "canceled";
  const isPastDue = subscription?.status === "past_due";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="font-semibold text-xl text-stone-900">Solvix.ai AI</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isTrialExpired ? "bg-amber-100" : isPastDue ? "bg-red-100" : "bg-indigo-100"
                }`}>
                  {isTrialExpired ? (
                    <Clock className="w-8 h-8 text-amber-600" />
                  ) : isPastDue ? (
                    <CreditCard className="w-8 h-8 text-red-600" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-indigo-600" />
                  )}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-stone-900 text-center mb-2">
                {isTrialExpired
                  ? "Din provperiod har slutat"
                  : isPastDue
                  ? "Betalning misslyckades"
                  : isCanceled
                  ? "Prenumerationen avslutad"
                  : "Prenumeration krävs"}
              </h1>

              {/* Description */}
              <p className="text-stone-600 text-center mb-6">
                {isTrialExpired
                  ? "Tack för att du testade Solvix.ai AI! För att fortsätta använda alla funktioner, välj en plan nedan."
                  : isPastDue
                  ? "Vi kunde inte dra betalningen. Uppdatera din betalningsmetod för att fortsätta."
                  : isCanceled
                  ? "Din prenumeration har avslutats. Återaktivera den för att få tillgång igen."
                  : "Du behöver en aktiv prenumeration för att använda Solvix.ai AI."}
              </p>

              {/* Trial info if applicable */}
              {subscription?.plan === "trial" && daysRemaining !== null && daysRemaining > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                  <p className="text-indigo-800 text-sm text-center">
                    <span className="font-semibold">{daysRemaining} dagar</span> kvar av din provperiod
                  </p>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Link
                  href="/pricing"
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Se priser och planer
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {(isPastDue || isCanceled) && (
                  <Link
                    href="/settings/billing"
                    className="w-full flex items-center justify-center gap-2 bg-stone-100 text-stone-900 py-3 px-4 rounded-lg font-semibold hover:bg-stone-200 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Hantera betalning
                  </Link>
                )}
              </div>

              {/* Sign out link */}
              <div className="mt-6 pt-6 border-t border-stone-200">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 text-stone-500 hover:text-stone-700 text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logga ut och byt konto
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-stone-500 text-sm mt-6">
          Har du frågor?{" "}
          <a href="mailto:support@solvix.ai" className="text-indigo-600 hover:underline">
            Kontakta oss
          </a>
        </p>
      </div>
    </div>
  );
}
