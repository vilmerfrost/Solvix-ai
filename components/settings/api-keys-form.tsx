"use client";

import { useState, useEffect } from "react";
import { Key, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2, Gauge, Zap } from "lucide-react";
import { useToast } from "@/components/toast";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const OpenAIIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-700" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464z" />
  </svg>
);

const AnthropicIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-700" fill="currentColor">
    <path d="M17.4224 4.37895C17.4876 4.26789 17.4876 4.12579 17.4224 4.01474L16.223 1.96842C16.1627 1.86579 16.0512 1.8 15.9351 1.8H13.5366C13.4205 1.8 13.309 1.86579 13.2486 1.96842L12.0492 4.01474C11.9841 4.12579 11.9841 4.26789 12.0492 4.37895L13.2486 6.42526C13.309 6.52789 13.4205 6.59368 13.5366 6.59368H15.9351C16.0512 6.59368 16.1627 6.52789 16.223 6.42526L17.4224 4.37895Z" />
    <path d="M21.2329 10.8789C21.2981 10.7679 21.2981 10.6258 21.2329 10.5147L20.0336 8.46842C19.9733 8.36579 19.8617 8.3 19.7457 8.3H17.3472C17.2311 8.3 17.1196 8.36579 17.0592 8.46842L15.8599 10.5147C15.7947 10.6258 15.7947 10.7679 15.8599 10.8789L17.0592 12.9253C17.1196 13.0279 17.2311 13.0937 17.3472 13.0937H19.7457C19.8617 13.0937 19.9733 13.0279 20.0336 12.9253L21.2329 10.8789Z" />
    <path d="M12.0492 10.5147C11.9841 10.6258 11.9841 10.7679 12.0492 10.8789L13.2486 12.9253C13.309 13.0279 13.4205 13.0937 13.5366 13.0937H15.9351C16.0512 13.0937 16.1627 13.0279 16.223 12.9253L17.4224 10.8789C17.4876 10.7679 17.4876 10.6258 17.4224 10.5147L16.223 8.46842C16.1627 8.36579 16.0512 8.3 15.9351 8.3H13.5366C13.4205 8.3 13.309 8.36579 13.2486 8.46842L12.0492 10.5147Z" />
    <path d="M8.23871 10.5147C8.17355 10.6258 8.17355 10.7679 8.23871 10.8789L9.43806 12.9253C9.49845 13.0279 9.60994 13.0937 9.72605 13.0937H12.1245C12.2406 13.0937 12.3521 13.0279 12.4125 12.9253L13.6119 10.8789C13.677 10.7679 13.677 10.6258 13.6119 10.5147L12.4125 8.46842C12.3521 8.36579 12.2406 8.3 12.1245 8.3H9.72605C9.60994 8.3 9.49845 8.36579 9.43806 8.46842L8.23871 10.5147Z" />
    <path d="M4.42816 10.5147C4.36301 10.6258 4.36301 10.7679 4.42816 10.8789L5.62752 12.9253C5.68791 13.0279 5.7994 13.0937 5.91551 13.0937H8.31396C8.43007 13.0937 8.54156 13.0279 8.60195 12.9253L9.80131 10.8789C9.86646 10.7679 9.86646 10.6258 9.80131 10.5147L8.60195 8.46842C8.54156 8.36579 8.43007 8.3 8.31396 8.3H5.91551C5.7994 8.3 5.68791 8.36579 5.62752 8.46842L4.42816 10.5147Z" />
    <path d="M12.0492 17.0147C11.9841 17.1258 11.9841 17.2679 12.0492 17.3789L13.2486 19.4253C13.309 19.5279 13.4205 19.5937 13.5366 19.5937H15.9351C16.0512 19.5937 16.1627 19.5279 16.223 19.4253L17.4224 17.3789C17.4876 17.2679 17.4876 17.1258 17.4224 17.0147L16.223 14.9684C16.1627 14.8658 16.0512 14.8 15.9351 14.8H13.5366C13.4205 14.8 13.309 14.8658 13.2486 14.9684L12.0492 17.0147Z" />
    <path d="M8.23871 17.0147C8.17355 17.1258 8.17355 17.2679 8.23871 17.3789L9.43806 19.4253C9.49845 19.5279 9.60994 19.5937 9.72605 19.5937H12.1245C12.2406 19.5937 12.3521 19.5279 12.4125 19.4253L13.6119 17.3789C13.677 17.2679 13.677 17.1258 13.6119 17.0147L12.4125 14.9684C12.3521 14.8658 12.2406 14.8 12.1245 14.8H9.72605C9.60994 14.8 9.49845 14.8658 9.43806 14.9684L8.23871 17.0147Z" />
  </svg>
);

const PROVIDERS = [
  { 
    id: "anthropic", 
    name: "Anthropic", 
    placeholder: "sk-ant-...", 
    description: "Claude Haiku (verification), Claude Sonnet (reconciliation)",
    icon: <AnthropicIcon />
  },
  { 
    id: "openai", 
    name: "OpenAI", 
    placeholder: "sk-...", 
    description: "GPT models (BYOK fallback)",
    icon: <OpenAIIcon />
  },
  { 
    id: "google", 
    name: "Google (Gemini)", 
    placeholder: "AIza...", 
    description: "Native Gemini access (alternative to OpenRouter)",
    icon: <GoogleIcon />
  },
  { 
    id: "mistral", 
    name: "Mistral AI", 
    placeholder: "...", 
    description: "PDF OCR, document structuring",
    icon: <Gauge className="w-5 h-5 text-purple-600" />
  },
  { 
    id: "openrouter", 
    name: "OpenRouter", 
    placeholder: "sk-or-...", 
    description: "Gemini 3 Flash (Excel extraction, quality assessment)",
    icon: <Zap className="w-5 h-5 text-amber-500" />
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
