"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { INDUSTRIES, type IndustryConfig } from "@/config/industries";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        {/* Progress */}
        <div className="text-center mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Steg 1 av 1
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">
            Välkommen till Vextra
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Vilken bransch jobbar du i? Vi anpassar verktyget efter dina behov.
          </p>
        </div>

        {/* Industry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
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
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
          <div className="text-center">
            <div className="text-2xl mb-1">&#x26A1;</div>
            <p className="text-xs text-slate-400">Ingen setup</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">&#x1F3AF;</div>
            <p className="text-xs text-slate-400">97% accuracy</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">&#x1F512;</div>
            <p className="text-xs text-slate-400">Krypterad data</p>
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedIndustry || saving}
            className="flex items-center gap-3 px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                Fortsätt
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// INDUSTRY CARD COMPONENT
// =============================================================================

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
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative p-5 rounded-xl text-left transition-all ${
        selected
          ? "bg-slate-800 border-2 border-emerald-500 ring-1 ring-emerald-500/30"
          : "bg-slate-900 border border-slate-800 hover:border-slate-600"
      }`}
    >
      {/* Selected Checkmark */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </motion.div>
      )}

      {/* Icon */}
      <div className="text-3xl mb-3">{industry.icon}</div>

      {/* Name */}
      <h3 className="font-semibold text-white text-sm mb-1">
        {industry.nameSv}
      </h3>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
        {industry.descriptionSv}
      </p>

      {/* Sample document types */}
      <div className="flex flex-wrap gap-1.5">
        {industry.sampleDocumentTypes.slice(0, 3).map((type) => (
          <span
            key={type}
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              selected
                ? "bg-emerald-900/50 text-emerald-300"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {type}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
