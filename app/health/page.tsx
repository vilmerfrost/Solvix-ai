"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";

interface HealthData {
  status: "healthy" | "degraded";
  timestamp: string;
  version: string;
  latency: number;
  checks: {
    database: { status: "ok" | "error"; latency?: number; message?: string };
    environment: { status: "ok" | "error"; message?: string };
  };
  services: {
    stripe: boolean;
    resend: boolean;
    sentry: boolean;
    azure: boolean;
    posthog: boolean;
  };
}

export default function HealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      setError("Kunde inte hämta hälsodata");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">{error || "Kunde inte ladda data"}</p>
          <button
            onClick={fetchHealth}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Tillbaka</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Systemhälsa</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Senast uppdaterad: {new Date(health.timestamp).toLocaleString("sv-SE")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchHealth}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  health.status === "healthy"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {health.status === "healthy" ? "✅ Allt fungerar" : "❌ Problem upptäckta"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">{health.latency}ms</div>
            <div className="text-sm text-gray-600 mt-1">Svarstid</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-gray-900">v{health.version}</div>
            <div className="text-sm text-gray-600 mt-1">Version</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-green-600">
              {Object.values(health.services).filter(Boolean).length}/
              {Object.values(health.services).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Tjänster aktiva</div>
          </div>
        </div>

        {/* Core Checks */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Systemkontroller</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
            {/* Database */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {health.checks.database.status === "ok" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Databas (Supabase)</p>
                  <p className="text-sm text-gray-500">
                    {health.checks.database.latency
                      ? `${health.checks.database.latency}ms svarstid`
                      : health.checks.database.message}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  health.checks.database.status === "ok"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {health.checks.database.status === "ok" ? "OK" : "FEL"}
              </span>
            </div>

            {/* Environment */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {health.checks.environment.status === "ok" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Miljövariabler</p>
                  <p className="text-sm text-gray-500">{health.checks.environment.message}</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  health.checks.environment.status === "ok"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {health.checks.environment.status === "ok" ? "OK" : "FEL"}
              </span>
            </div>
          </div>
        </div>

        {/* External Services */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Externa tjänster</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <ServiceCard name="Stripe" active={health.services.stripe} />
            <ServiceCard name="Resend" active={health.services.resend} />
            <ServiceCard name="Sentry" active={health.services.sentry} />
            <ServiceCard name="Azure" active={health.services.azure} />
            <ServiceCard name="PostHog" active={health.services.posthog} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ name, active }: { name: string; active: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
      <div className="flex items-center justify-center mb-2">
        {active ? (
          <CheckCircle className="w-6 h-6 text-green-500" />
        ) : (
          <XCircle className="w-6 h-6 text-gray-300" />
        )}
      </div>
      <p className="text-sm font-medium text-gray-700">{name}</p>
      <p className={`text-xs ${active ? "text-green-600" : "text-gray-400"}`}>
        {active ? "Konfigurerad" : "Ej konfigurerad"}
      </p>
    </div>
  );
}
