"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Palette, Globe, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

const LANGUAGES = [
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "no", name: "Norsk", flag: "🇳🇴" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
] as const;

const COLOR_PRESETS = [
  { name: "Indigo (Solvix.ai)", value: "#6366F1" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Orange", value: "#F97316" },
  { name: "Teal", value: "#14B8A6" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    companyName: "",
    companySlug: "",
    companyLogo: "",
    primaryColor: "#6366F1", // Solvix.ai AI brand color
    language: "sv" as "sv" | "en" | "no" | "fi",
  });

  // Auto-generate slug from company name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/[ö]/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCompanyNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      companyName: name,
      companySlug: generateSlug(name),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Setup failed");
      }

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome to Solvix.ai AI
          </h1>
          <p className="text-slate-600">
            Let's set up your intelligent document extraction system
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  step >= s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 rounded ${
                    step > s ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Company Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Basic details about your organization
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    placeholder="e.g., Acme Waste Management"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    System Slug
                  </label>
                  <input
                    type="text"
                    value={formData.companySlug}
                    onChange={(e) => setFormData(prev => ({ ...prev, companySlug: e.target.value }))}
                    placeholder="auto-generated"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Used for URLs and internal identification
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Logo URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.companyLogo}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyLogo: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Branding */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Branding
                  </h2>
                  <p className="text-sm text-slate-500">
                    Customize the look of your system
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Primary Color
                  </label>
                  <div className="grid grid-cols-6 gap-3 mb-4">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, primaryColor: color.value }))}
                        className={`w-12 h-12 rounded-lg transition-all ${
                          formData.primaryColor === color.value
                            ? "ring-2 ring-offset-2 ring-slate-900 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg border-2 font-medium"
                      style={{ borderColor: formData.primaryColor, color: formData.primaryColor }}
                    >
                      Secondary
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Language */}
          {step === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Language & Region
                  </h2>
                  <p className="text-sm text-slate-500">
                    Select your preferred language
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, language: lang.code }))}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      formData.language === lang.code
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="font-medium text-slate-900">{lang.name}</span>
                    {formData.language === lang.code && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-3">Setup Summary</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Company:</dt>
                    <dd className="font-medium text-slate-900">{formData.companyName || "Not set"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Slug:</dt>
                    <dd className="font-mono text-slate-900">{formData.companySlug || "—"}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-slate-500">Color:</dt>
                    <dd className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: formData.primaryColor }}
                      />
                      <span className="font-mono text-slate-900">{formData.primaryColor}</span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Language:</dt>
                    <dd className="font-medium text-slate-900">
                      {LANGUAGES.find(l => l.code === formData.language)?.name}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-8 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="px-6 py-2.5 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={step === 1 && !formData.companyName.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !formData.companyName.trim()}
                className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          You can change these settings later in the Settings page
        </p>
      </div>
    </div>
  );
}
