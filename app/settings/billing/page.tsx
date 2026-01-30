"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/billing/subscription");
        const data = await res.json();
        
        if (data.success) {
          setSubscription(data.subscription);
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error opening portal:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  const planNames: Record<string, string> = {
    free: "Gratis",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: "Aktiv", color: "text-green-600 bg-green-50" },
    trialing: { label: "Provperiod", color: "text-blue-600 bg-blue-50" },
    past_due: { label: "Betalning försenad", color: "text-red-600 bg-red-50" },
    canceled: { label: "Avslutad", color: "text-gray-600 bg-gray-50" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Tillbaka till inställningar
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Fakturering & prenumeration
        </h1>

        {/* Success message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800">
              Din prenumeration har aktiverats! Tack för att du valde Vextra AI Pro.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Nuvarande plan
              </h2>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {planNames[subscription?.plan || "free"]}
                    </p>
                    {subscription?.status && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          statusLabels[subscription.status]?.color || ""
                        }`}
                      >
                        {statusLabels[subscription.status]?.label || subscription.status}
                      </span>
                    )}
                  </div>
                </div>

                {subscription?.plan !== "free" && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {portalLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Hantera prenumeration
                  </button>
                )}
              </div>

              {/* Period info */}
              {subscription?.currentPeriodEnd && subscription.plan !== "free" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    {subscription.cancelAtPeriodEnd ? (
                      <>
                        <AlertCircle className="w-4 h-4 inline mr-1 text-amber-500" />
                        Prenumerationen avslutas{" "}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString("sv-SE")}
                      </>
                    ) : (
                      <>
                        Nästa fakturering:{" "}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString("sv-SE")}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Upgrade CTA for free users */}
            {subscription?.plan === "free" && (
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">
                  Uppgradera till Pro
                </h3>
                <p className="text-indigo-100 mb-4">
                  Få tillgång till fler dokument, alla AI-modeller och prioriterad support.
                </p>
                <Link
                  href="/pricing"
                  className="inline-block px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Se planer
                </Link>
              </div>
            )}

            {/* Payment method */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Betalningsmetod
              </h2>

              {subscription?.plan === "free" ? (
                <p className="text-gray-600">
                  Ingen betalningsmetod krävs för gratisplanen.
                </p>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">
                    Hantera din betalningsmetod via Stripe.
                  </p>
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Ändra betalningsmetod
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function BillingPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingPageLoading />}>
      <BillingPageContent />
    </Suspense>
  );
}
