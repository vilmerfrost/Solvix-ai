"use client";

import { useState, useEffect } from "react";
import { Loader2, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/toast";

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
        // Merge with defaults in case fields are missing
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
            <select
              value={preferences.defaultPdfModel}
              onChange={(e) => setPreferences({ ...preferences, defaultPdfModel: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="mistral-ocr">Mistral OCR (Rekommenderad)</option>
              <option value="claude-vision">Claude 3.5 Sonnet</option>
              <option value="gemini-vision">Gemini 1.5 Pro</option>
            </select>
            <p className="text-xs text-gray-500">
              Används för att läsa text och struktur från PDF-filer och bilder.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Excel Extraktion
            </label>
            <select
              value={preferences.defaultExcelModel}
              onChange={(e) => setPreferences({ ...preferences, defaultExcelModel: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="gemini-flash">Gemini 2.0 Flash (Snabbast)</option>
              <option value="claude-haiku">Claude 3 Haiku</option>
              <option value="openai-gpt">GPT-4o Mini</option>
            </select>
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
