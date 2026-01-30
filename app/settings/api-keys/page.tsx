"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Key, 
  Check, 
  X, 
  ExternalLink, 
  Loader2, 
  Trash2,
  Eye,
  EyeOff,
  Shield
} from "lucide-react";

interface ProviderStatus {
  provider: string;
  name: string;
  logo: string;
  apiKeyUrl: string;
  description: string;
  hasKey: boolean;
  keyHint: string | null;
  isValid: boolean | null;
  savedAt: string | null;
}

export default function APIKeysPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [showInput, setShowInput] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch providers on load
  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/user/api-keys");
      const data = await response.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (err) {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (provider: string) => {
    if (!inputValue.trim()) {
      setError("Please enter an API key");
      return;
    }

    setSaving(provider);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: inputValue }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setShowInput(null);
        setInputValue("");
        fetchProviders();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to save API key");
    } finally {
      setSaving(null);
    }
  };

  const handleValidate = async (provider: string) => {
    setValidating(provider);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/user/api-keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (data.isValid) {
        setSuccess(data.message);
      } else {
        setError(data.error || "API key validation failed");
      }
      fetchProviders();
    } catch (err) {
      setError("Failed to validate API key");
    } finally {
      setValidating(null);
    }
  };

  const handleDelete = async (provider: string) => {
    if (!confirm("Are you sure you want to remove this API key?")) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/user/api-keys?provider=${provider}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        fetchProviders();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete API key");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Settings</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
              <p className="text-gray-600">
                Add your AI provider API keys to enable document extraction
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Your keys are secure</p>
            <p className="text-sm text-blue-700">
              API keys are encrypted with AES-256 before storage. They are never exposed to the client.
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <X className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Provider Cards */}
        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.provider}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                      {provider.logo}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-500">{provider.description}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {provider.hasKey && (
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        provider.isValid
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {provider.isValid ? "Active" : "Not Verified"}
                    </div>
                  )}
                </div>

                {/* Key Info or Input */}
                {provider.hasKey && showInput !== provider.provider ? (
                  <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        API Key: <span className="font-mono">{provider.keyHint}</span>
                      </p>
                      {provider.savedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last updated: {new Date(provider.savedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleValidate(provider.provider)}
                        disabled={validating === provider.provider}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {validating === provider.provider ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Test"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowInput(provider.provider);
                          setInputValue("");
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDelete(provider.provider)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : showInput === provider.provider ? (
                  <div className="mt-4 space-y-3">
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={`Enter your ${provider.name} API key`}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSaveKey(provider.provider)}
                        disabled={saving === provider.provider}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving === provider.provider ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Key"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowInput(null);
                          setInputValue("");
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setShowInput(provider.provider);
                        setInputValue("");
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Add API Key
                    </button>
                  </div>
                )}

                {/* Get API Key Link */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <a
                    href={provider.apiKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Get your {provider.name} API key
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Need help?</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Google AI:</strong> Get your API key from{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-600 hover:underline">
                Google AI Studio
              </a>
              . Gemini models are recommended for best accuracy.
            </p>
            <p>
              <strong>OpenAI:</strong> Create an API key at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">
                OpenAI Platform
              </a>
              . GPT-4o excels at handwritten documents.
            </p>
            <p>
              <strong>Anthropic:</strong> Get your key from{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-blue-600 hover:underline">
                Anthropic Console
              </a>
              . Claude is great for complex reasoning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
