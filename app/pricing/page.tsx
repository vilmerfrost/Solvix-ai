"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Sparkles, Building2, Zap } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    priceSek: "0 kr",
    period: "/månad",
    description: "Perfekt för att prova Vextra AI",
    features: [
      "10 dokument/månad",
      "Gemini Flash-modell",
      "Grundläggande support",
      "Dashboard & export",
    ],
    notIncluded: [
      "Alla AI-modeller",
      "Anpassade instruktioner",
      "Prioriterad bearbetning",
    ],
    cta: "Kom igång gratis",
    highlighted: false,
    icon: Zap,
  },
  {
    id: "pro",
    name: "Pro",
    price: 299,
    priceSek: "299 kr",
    period: "/månad",
    description: "För professionell dokumenthantering",
    features: [
      "500 dokument/månad",
      "Alla AI-modeller",
      "Anpassade instruktioner",
      "Prioriterad bearbetning",
      "E-postsupport",
      "Detaljerad statistik",
    ],
    notIncluded: [],
    cta: "Starta Pro",
    highlighted: true,
    icon: Sparkles,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 999,
    priceSek: "999 kr",
    period: "/månad",
    description: "För organisationer med höga krav",
    features: [
      "Obegränsade dokument",
      "Alla AI-modeller",
      "Anpassade instruktioner",
      "Prioriterad bearbetning",
      "Dedikerad support",
      "SLA-garanti",
      "Custom integrations",
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="font-semibold text-slate-900">Vextra AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
              Logga in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Kom igång
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Canceled notice */}
        {canceled && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <p className="text-amber-800">
              Betalningen avbröts. Välj en plan nedan för att fortsätta.
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Enkel prissättning, kraftfulla funktioner
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Välj den plan som passar dina behov. Uppgradera eller nedgradera när som helst.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${
                plan.highlighted
                  ? "border-indigo-600 shadow-xl shadow-indigo-500/10"
                  : "border-slate-200"
              } bg-white p-8`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-sm font-medium px-4 py-1 rounded-full">
                    Mest populär
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlighted ? "bg-indigo-100" : "bg-slate-100"
                  }`}
                >
                  <plan.icon
                    className={`w-5 h-5 ${
                      plan.highlighted ? "text-indigo-600" : "text-slate-600"
                    }`}
                  />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">{plan.name}</h2>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-bold text-slate-900">{plan.priceSek}</span>
                <span className="text-slate-600">{plan.period}</span>
              </div>

              <p className="text-slate-600 mb-6">{plan.description}</p>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-lg font-semibold transition-colors mb-8 flex items-center justify-center gap-2 ${
                  plan.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200"
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
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
                {plan.notIncluded.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 opacity-50">
                    <Check className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    <span className="text-slate-500 line-through">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-slate-600">
            Har du frågor?{" "}
            <a
              href="mailto:vilmer.frost@gmail.com"
              className="text-indigo-600 hover:underline"
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
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
