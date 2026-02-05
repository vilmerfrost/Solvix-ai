"use client";

import { useState, useEffect } from "react";
import { Loader2, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { RichModelSelect } from "@/components/ui/rich-select";

interface ModelPreferencesData {
  defaultPdfModel: "mistral-ocr" | "claude-vision" | "gemini-vision";
  defaultExcelModel: "gemini-flash" | "claude-haiku" | "openai-gpt";
  enableVerification: boolean;
  enableReconciliation: boolean;
  reconciliationThreshold: number;
}

export function ModelPreferences() {
  const toast = useToast();
  const [preferences, setPreferences] = useState<ModelPreferencesData>({
    defaultPdfModel: "mistral-ocr",
    defaultExcelModel: "gemini-flash",
    enableVerification: true,
    enableReconciliation: true,
    reconciliationThreshold: 80,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      if (response.ok) {
        const data = await response.json();
        setPreferences((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Failed to fetch model preferences", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast.success(
          "Inställningar sparade",
          "Dina modellpreferenser har uppdaterats."
        );
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast.error(
        "Kunde inte spara",
        "Ett fel uppstod när inställningarna skulle sparas."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Model Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Standardmodeller</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              PDF & Bildanalys (OCR)
            </label>
            <RichModelSelect
              value={preferences.defaultPdfModel}
              onChange={(value) => setPreferences({ ...preferences, defaultPdfModel: value as any })}
              options={[
                { value: "mistral-ocr", label: "Mistral OCR", provider: "mistral", tier: "balanced", price: "~10 öre/dok", available: true },
                { value: "claude-vision", label: "Claude 3.5 Sonnet", provider: "anthropic", tier: "premium", price: "~32 öre/dok", available: true },
                { value: "gemini-vision", label: "Gemini 1.5 Pro", provider: "google", tier: "premium", price: "~21 öre/dok", available: true },
              ]}
            />
            <p className="text-xs text-gray-500">
              Används för att läsa text och struktur från PDF-filer och bilder.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Excel Extraktion
            </label>
            <RichModelSelect
              value={preferences.defaultExcelModel}
              onChange={(value) => setPreferences({ ...preferences, defaultExcelModel: value as any })}
              options={[
                { value: "gemini-flash", label: "Gemini 2.0 Flash", provider: "google", tier: "fast", price: "~5 öre/dok", available: true },
                { value: "claude-haiku", label: "Claude 3 Haiku", provider: "anthropic", tier: "fast", price: "~10 öre/dok", available: true },
                { value: "openai-gpt", label: "GPT-4o Mini", provider: "openai", tier: "fast", price: "~18 öre/dok", available: true },
              ]}
            />
            <p className="text-xs text-gray-500">
              Används för att analysera och extrahera data från Excel-filer.
            </p>
          </div>
        </div>
      </div>

      {/* Verification & Reconciliation */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Kvalitetssäkring</h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900">
              Verifiering är alltid aktiverad
            </p>
            <p className="text-xs text-blue-700">
              För att säkerställa högsta kvalitet verifieras alla extraktioner automatiskt mot källdokumentet för att upptäcka potentiella fel (hallucinationer).
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <div className="flex items-center h-5">
              <input
                id="reconciliation"
                type="checkbox"
                checked={preferences.enableReconciliation}
                onChange={(e) => setPreferences({ ...preferences, enableReconciliation: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="reconciliation" className="font-medium text-gray-700 block text-sm">
                Aktivera Avancerad Försoning (Reconciliation)
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Om verifieringen hittar fel eller osäkerheter, kör en kraftfullare modell (Claude 3.5 Sonnet) för att lösa konflikten.
              </p>
            </div>
          </div>

          {preferences.enableReconciliation && (
            <div className="pl-7">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tröskelvärde för försoning: {preferences.reconciliationThreshold}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={preferences.reconciliationThreshold}
                onChange={(e) => setPreferences({ ...preferences, reconciliationThreshold: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0% (Alltid)</span>
                <span>100% (Aldrig)</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Extraktioner med konfidens under {preferences.reconciliationThreshold}% skickas automatiskt till försoning om problem upptäcks.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ml-auto"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sparar...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Spara inställningar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
