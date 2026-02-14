"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Loader2, Zap, Shield, CheckCircle } from "lucide-react";
import { INDUSTRIES, type IndustryConfig } from "@/config/industries";
import { createBrowserClient } from "@supabase/ssr";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: settings } = await supabase
        .from("settings")
        .select("onboarding_complete, industry")
        .eq("user_id", user.id)
        .single();
      if (settings?.onboarding_complete && settings?.industry) {
        router.push("/dashboard");
      }
    }
    checkOnboarding();
  }, [router]);

  const handleSubmit = async () => {
    if (!selectedIndustry) return;

    setSaving(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: selectedIndustry }),
      });

      const data = await response.json();
      if (data.success) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Onboarding failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with Logo */}
      <header className="nav-premium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Solvix.AI</span>
          </div>
          <button className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all text-sm">
            ?
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-8 py-5 border-b border-slate-100 bg-white">
        <div className="max-w-[500px] mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Steg 1 av 1</span>
            <span className="text-xs font-medium text-slate-500">100% slutfört</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-500 w-full" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-8 py-12 flex flex-col items-center bg-[#f8f9fa]">
        {/* Header */}
        <div className="max-w-[960px] w-full text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            Välkommen till Solvix.AI
          </h1>
          <p className="text-base text-slate-500">
            Välj din bransch för att anpassa din upplevelse
          </p>
        </div>

        {/* Industry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-[960px] mb-12">
          {INDUSTRIES.map((industry) => (
            <IndustryCard
              key={industry.id}
              industry={industry}
              selected={selectedIndustry === industry.id}
              onSelect={() => setSelectedIndustry(industry.id)}
            />
          ))}
        </div>

        {/* Feature Callouts */}
        <div className="flex flex-wrap justify-center gap-8 mb-12 w-full max-w-[960px]">
          <div className="flex items-center gap-2 text-slate-600">
            <Zap className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium">Ingen setup</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium">97% accuracy</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium">Krypterad data</span>
          </div>
        </div>

        {/* Continue Button */}
        <div className="w-full max-w-[400px]">
          <button
            onClick={handleSubmit}
            disabled={!selectedIndustry || saving}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                Fortsätt
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
          <p className="text-center mt-4 text-xs text-slate-400">
            Genom att fortsätta godkänner du våra användarvillkor.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-8 flex justify-center border-t border-slate-100 bg-white">
        <div className="max-w-[960px] w-full flex justify-between items-center text-slate-400 text-sm">
          <p>© 2026 Solvix.AI - Scandinavian Document Intelligence</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-indigo-600 transition-colors">Integritet</a>
            <a href="mailto:kontakt@solvix.ai" className="hover:text-indigo-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Industry Card Component
function IndustryCard({
  industry,
  selected,
  onSelect,
}: {
  industry: IndustryConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col p-6 rounded-xl text-left transition-all ${
        selected
          ? "bg-indigo-50 border-2 border-indigo-500 shadow-sm"
          : "bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md"
      }`}
    >
      {/* Checkmark */}
      {selected && (
        <div className="absolute top-4 right-4 bg-indigo-600 text-white rounded-full p-0.5">
          <Check className="w-4 h-4" strokeWidth={3} />
        </div>
      )}

      {/* Icon */}
      <div className="text-4xl mb-4">{industry.icon}</div>

      {/* Name */}
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        {industry.nameSv}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        {industry.descriptionSv}
      </p>

      {/* Sample Document Tags */}
      <div className="flex flex-wrap gap-2 mt-auto">
        {industry.sampleDocumentTypes.slice(0, 2).map((type) => (
          <span
            key={type}
            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded border ${
              selected
                ? "bg-white text-indigo-600 border-indigo-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            {type}
          </span>
        ))}
      </div>
    </button>
  );
}
