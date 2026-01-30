"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Sparkles, Building2, Zap } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    id: "pro",
    name: "Pro",
    price: 1990,
    priceSek: "1 990 kr",
    period: "/månad",
    description: "Fullständig dokumentextraktion för ditt företag",
    features: [
      "Obegränsade dokument",
      "Alla AI-modeller (Claude, Gemini, GPT)",
      "Anpassade extraktionsinstruktioner",
      "Prioriterad bearbetning",
      "Azure Blob Storage-integration",
      "E-postsupport",
      "Dashboard & export till Excel",
      "Detaljerad användningsstatistik",
    ],
    notIncluded: [],
    cta: "Starta Pro",
    highlighted: true,
    icon: Sparkles,
  },
  {
    id: "enterprise",
    name: "Enterprise / Whitelabel",
    price: 20000,
    priceSek: "20 000 kr",
    period: "engångsavgift",
    description: "Egen instans med ditt varumärke",
    features: [
      "Allt i Pro",
      "Whitelabel med eget varumärke",
      "Egen Vercel/server-deployment",
      "Egen Supabase-databas",
      "Full källkodsåtkomst",
      "Dedikerad onboarding",
      "Prioriterad support",
      "Livstidsuppdateringar",
    ],
    notIncluded: [],
    cta: "Kontakta oss",
    highlighted: false,
    icon: Building2,
  },
];

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") {
      router.push("/signup");
      return;
    }

    if (planId === "enterprise") {
      window.location.href = "mailto:vilmer.frost@gmail.com?subject=Vextra AI Enterprise";
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "Unauthorized") {
        router.push("/login?next=/pricing");
      } else {
        alert(data.error || "Något gick fel");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Något gick fel. Försök igen.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="font-semibold text-stone-900">Vextra AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900 font-medium">
              Logga in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm"
            >
              Kom igång
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Canceled notice */}
        {canceled && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-800">
              Betalningen avbröts. Välj en plan nedan för att fortsätta.
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-stone-900 mb-4">
            Enkel prissättning, kraftfulla funktioner
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl mx-auto">
            Välj den plan som passar dina behov. Uppgradera eller nedgradera när som helst.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${
                plan.highlighted
                  ? "border-indigo-500 shadow-xl shadow-indigo-500/10"
                  : "border-stone-200 shadow-lg shadow-stone-200/50"
              } bg-white p-8`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-full shadow-sm">
                    Mest populär
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    plan.highlighted ? "bg-indigo-100" : "bg-stone-100"
                  }`}
                >
                  <plan.icon
                    className={`w-5 h-5 ${
                      plan.highlighted ? "text-indigo-600" : "text-stone-600"
                    }`}
                  />
                </div>
                <h2 className="text-xl font-semibold text-stone-900">{plan.name}</h2>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-bold text-stone-900">{plan.priceSek}</span>
                <span className="text-stone-500 ml-1">{plan.period}</span>
              </div>

              <p className="text-stone-500 mb-6">{plan.description}</p>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 flex items-center justify-center gap-2 ${
                  plan.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Laddar...
                  </>
                ) : (
                  plan.cta
                )}
              </button>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-stone-600">{feature}</span>
                  </li>
                ))}
                {plan.notIncluded.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 opacity-50">
                    <Check className="w-5 h-5 text-stone-300 flex-shrink-0" />
                    <span className="text-stone-400 line-through">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-stone-500">
            Har du frågor?{" "}
            <a
              href="mailto:vilmer.frost@gmail.com"
              className="text-indigo-600 hover:underline font-medium"
            >
              Kontakta oss
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

// Loading fallback for Suspense
function PricingPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageLoading />}>
      <PricingPageContent />
    </Suspense>
  );
}
