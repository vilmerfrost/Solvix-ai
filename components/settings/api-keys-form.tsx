"use client";

import { useState, useEffect } from "react";
import { Key, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";

const PROVIDERS = [
  { 
    id: "anthropic", 
    name: "Anthropic", 
    placeholder: "sk-ant-...", 
    description: "Claude Haiku (verification), Claude Sonnet (reconciliation)",
    icon: "🟠"
  },
  { 
    id: "openai", 
    name: "OpenAI", 
    placeholder: "sk-...", 
    description: "GPT models (BYOK fallback)",
    icon: "🟢"
  },
  { 
    id: "google", 
    name: "Google (Gemini)", 
    placeholder: "AIza...", 
    description: "Native Gemini access (alternative to OpenRouter)",
    icon: "🔷"
  },
  { 
    id: "mistral", 
    name: "Mistral AI", 
    placeholder: "...", 
    description: "PDF OCR, document structuring",
    icon: "🟪"
  },
  { 
    id: "openrouter", 
    name: "OpenRouter", 
    placeholder: "sk-or-...", 
    description: "Gemini 3 Flash (Excel extraction, quality assessment)",
    icon: "🦄"
  },
] as const;

interface ApiKeyStatus {
  provider: string;
  configured: boolean;
}

export function ApiKeysForm() {
  const toast = useToast();
  const [statuses, setStatuses] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchKeysStatus();
  }, []);

  const fetchKeysStatus = async () => {
    try {
      const response = await fetch("/api/user/api-keys");
      if (response.ok) {
        const data = await response.json();
        // Assuming data.keys is an array of { provider: string, configured: boolean }
        // or array of provider strings that are configured
        setStatuses(data.statuses || []); 
      }
    } catch (error) {
      console.error("Failed to fetch API key status", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: string) => {
    const key = apiKeys[provider];
    if (!key) return;

    setSaving(provider);
    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      });

      if (response.ok) {
        toast.success(
          "API-nyckel sparad",
          `${PROVIDER_NAMES[provider as keyof typeof PROVIDER_NAMES]} nyckel har sparats.`
        );
        setExpandedProvider(null);
        setApiKeys((prev) => ({ ...prev, [provider]: "" }));
        fetchKeysStatus();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast.error(
        "Kunde inte spara",
        "Ett fel uppstod när nyckeln skulle sparas."
      );
    } finally {
      setSaving(null);
    }
  };

  const PROVIDER_NAMES = PROVIDERS.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});

  const isConfigured = (providerId: string) => {
    return statuses.some(s => s.provider === providerId && s.configured);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map((provider) => {
          const configured = isConfigured(provider.id);
          const isExpanded = expandedProvider === provider.id;

          return (
            <div 
              key={provider.id}
              className={`border rounded-lg transition-all duration-200 ${
                isExpanded ? "ring-2 ring-blue-500 border-transparent shadow-lg" : "border-gray-200 hover:border-gray-300"
              } bg-white dark:bg-zinc-900`}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label={provider.name}>
                      {provider.icon}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {provider.name}
                    </span>
                  </div>
                  {configured ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Konfigurerad
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Ej konfigurerad
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mb-3 h-8 line-clamp-2">
                  {provider.description}
                </p>

                <div className="flex items-center justify-center pt-2">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-2 bg-gray-50/50 rounded-b-lg">
                  <div className="pt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        API Nyckel
                      </label>
                      <input
                        type="password"
                        placeholder={provider.placeholder}
                        value={apiKeys[provider.id] || ""}
                        onChange={(e) => setApiKeys({ ...apiKeys, [provider.id]: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(provider.id);
                      }}
                      disabled={saving === provider.id || !apiKeys[provider.id]}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving === provider.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      Spara nyckel
                    </button>
                    <p className="text-xs text-gray-400 text-center">
                      Nyckeln lagras krypterat.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
