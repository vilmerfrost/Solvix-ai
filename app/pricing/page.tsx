"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "499",
    period: "/month",
    description: "Perfect for small teams getting started",
    features: [
      { text: "50 documents/month", included: true },
      { text: "Fast AI models (Gemini, GPT, Claude Haiku)", included: true },
      { text: "Excel export", included: true },
      { text: "Email support", included: true },
      { text: "Custom extraction instructions", included: false },
      { text: "Azure Blob integration", included: false },
    ],
    cta: "Start with Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "1,990",
    period: "/month",
    description: "Unlimited processing for growing businesses",
    features: [
      { text: "Unlimited documents", included: true },
      { text: "All AI models (including premium)", included: true },
      { text: "Excel export", included: true },
      { text: "Email support", included: true },
      { text: "Custom extraction instructions", included: true },
      { text: "Azure Blob integration", included: true },
    ],
    cta: "Start with Pro",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "20,000",
    period: "one-time",
    description: "Self-hosted with full source code",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Whitelabel / your branding", included: true },
      { text: "Self-hosted deployment", included: true },
      { text: "Full source code access", included: true },
      { text: "Dedicated onboarding", included: true },
      { text: "Priority support + SLA", included: true },
    ],
    cta: "Contact us",
    highlighted: false,
  },
];

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === "enterprise") {
      window.location.href = "mailto:vilmer.frost@gmail.com?subject=Vextra AI Enterprise Inquiry";
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
        alert(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-purple-600/6 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-semibold text-white/90 text-lg tracking-tight">Vextra</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link 
                href="/signup" 
                className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20">
        {/* Canceled notice */}
        {canceled && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
            <p className="text-amber-400">
              Payment was canceled. Select a plan below to continue.
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-6">
            Pay for the platform. Bring your own AI API keys.
          </p>
          
          {/* BYOK callout */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            BYOK — You control your AI costs
          </div>
        </div>

        {/* Plans */}
        <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${
                plan.highlighted
                  ? "border-indigo-500/50 bg-white/[0.03]"
                  : "border-white/[0.06] bg-white/[0.02]"
              } p-8`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">{plan.name}</h2>
                <p className="text-sm text-white/40">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-white/40 ml-1">SEK {plan.period}</span>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 flex items-center justify-center gap-2 ${
                  plan.highlighted
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/[0.05] text-white hover:bg-white/[0.08] border border-white/[0.1]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  plan.cta
                )}
              </button>

              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-white/20 flex-shrink-0" />
                    )}
                    <span className={feature.included ? "text-white/70" : "text-white/30"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* BYOK Explanation */}
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How BYOK (Bring Your Own Key) works
            </h3>
            <div className="space-y-4 text-white/50">
              <p>
                <strong className="text-white/70">You provide your own API keys</strong> for AI providers (OpenAI, Google, Anthropic). 
                This means you pay AI providers directly at their rates — no markup from us.
              </p>
              <p>
                <strong className="text-white/70">Your subscription covers:</strong> the Vextra platform, document processing infrastructure, 
                data storage, Excel exports, and support. AI costs are separate and depend on your usage.
              </p>
              <div className="pt-4 border-t border-white/[0.06]">
                <p className="text-sm">
                  <strong className="text-white/70">Typical AI cost:</strong> ~0.10-0.50 SEK per document depending on model choice.
                  Most users process 50-500 documents/month = 5-250 SEK in AI costs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <p className="text-white/40">
            Questions?{" "}
            <a
              href="mailto:vilmer.frost@gmail.com"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Contact us
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/[0.04] py-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-sm text-white/40">© 2026 Vextra AI</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingPageLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
