"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Save, Bell, Mail, Percent, RefreshCw } from "lucide-react";
import { Button, Skeleton, useToast } from "@/components/ui/index";
import { FortnoxStatusCard } from "@/components/price-monitor/fortnox-status-card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  saveSettings,
  PriceMonitorSettings,
  getDefaultPriceMonitorSettings,
} from "@/lib/price-monitor-api";
import {
  SUPPORTED_PRICE_MONITOR_CURRENCIES,
  PRICE_MONITOR_BASE_CURRENCY,
  normalizeExchangeRates,
  normalizeManualExchangeRates,
  type SupportedPriceMonitorCurrency,
} from "@/lib/price-monitor-currency";

export default function PriceMonitorSettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const locale = useLocale() === "en" ? "en-GB" : "sv-SE";
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [settings, setSettings] = useState<PriceMonitorSettings>(
    getDefaultPriceMonitorSettings()
  );

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { router.push("/auth/login"); return; }
      setSession(s);

      try {
        const data = await fetchDashboard<PriceMonitorSettings>("settings", undefined, s);
        setSettings(data);
      } catch {
        // Use defaults if not configured yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function persistSettings(options?: {
    successTitle?: string;
    successMessage?: string;
    refreshOnly?: boolean;
  }) {
    if (!session) return;
    if (options?.refreshOnly) {
      setRefreshingRates(true);
    } else {
      setSaving(true);
    }

    try {
      const saved = await saveSettings(settings, session);
      setSettings(saved);
      addToast({
        type: "success",
        title: options?.successTitle ?? t("saveSuccess"),
        description: options?.successMessage,
      });
    } catch (e) {
      addToast({
        type: "error",
        title: t("saveError"),
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
      setRefreshingRates(false);
    }
  }

  async function handleSave() {
    await persistSettings();
  }

  async function handleRefreshRates() {
    await persistSettings({
      refreshOnly: true,
      successTitle: t("ratesUpdated"),
      successMessage: t("ratesUpdatedDesc"),
    });
  }

  function setManualRate(
    currency: Exclude<SupportedPriceMonitorCurrency, typeof PRICE_MONITOR_BASE_CURRENCY>,
    value: string
  ) {
    setSettings((prev) => {
      const manualRates = normalizeManualExchangeRates(prev.manual_exchange_rates);
      const trimmed = value.trim();
      if (!trimmed) {
        delete manualRates[currency];
      } else {
        const parsed = Number(trimmed.replace(",", "."));
        if (Number.isFinite(parsed) && parsed > 0) {
          manualRates[currency] = parsed;
        }
      }

      return {
        ...prev,
        manual_exchange_rates: manualRates,
        exchange_rates: normalizeExchangeRates(prev.exchange_rates),
      };
    });
  }

  const updatedAtLabel = settings.exchange_rates_updated_at
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(settings.exchange_rates_updated_at))
    : t("notUpdatedYet");

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t("title")}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {t("description")}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Alert threshold */}
          <div
            className="rounded-xl border p-5"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-accent-muted)" }}
              >
                <Percent className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {t("alertThreshold")}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t("alertThresholdDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                className="rounded-lg border px-3 py-2 text-sm w-28"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
                value={settings.alert_threshold_percent}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    alert_threshold_percent: parseFloat(e.target.value) || 5.0,
                  }))
                }
              />
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                %
              </span>
            </div>
          </div>

          {/* Auto alert toggle */}
          <div
            className="rounded-xl border p-5"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--color-accent-muted)" }}
                >
                  <Bell className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t("autoAlerts")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {t("autoAlertsDesc")}
                  </p>
                </div>
              </div>
              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={settings.auto_alert}
                onClick={() =>
                  setSettings((prev) => ({ ...prev, auto_alert: !prev.auto_alert }))
                }
                className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus-visible:ring-2"
                style={{
                  background: settings.auto_alert
                    ? "var(--color-accent)"
                    : "var(--color-border)",
                  focusVisibleRingColor: "var(--color-accent)",
                }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: settings.auto_alert ? "translateX(20px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Notify email */}
          <div
            className="rounded-xl border p-5"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-accent-muted)" }}
              >
                <Mail className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {t("emailNotifications")}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t("emailNotificationsDesc")}
                </p>
              </div>
            </div>
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              placeholder={t("emailPlaceholder")}
              value={settings.notify_email ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  notify_email: e.target.value || null,
                }))
              }
            />
          </div>

          {/* Currency conversion */}
          <div
            className="rounded-xl border p-5"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t("currencyTitle")}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {t("currencyDesc")}
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                  {t("sourceAndUpdated", {
                    source: settings.exchange_rates_source ?? "Frankfurter",
                    updatedAt: updatedAtLabel,
                  })}
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                loading={refreshingRates}
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={handleRefreshRates}
              >
                {t("updateRates")}
              </Button>
            </div>

            <div className="space-y-3">
              {SUPPORTED_PRICE_MONITOR_CURRENCIES.filter(
                (currency) => currency !== PRICE_MONITOR_BASE_CURRENCY
              ).map((currency) => {
                const autoRate = settings.exchange_rates[currency];
                const manualRate = settings.manual_exchange_rates[currency];

                return (
                  <div
                    key={currency}
                    className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr] gap-3 items-center rounded-lg border p-3"
                    style={{
                      background: "var(--color-bg)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {currency}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        1 {currency}
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-xs mb-1"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {t("autoRate")}
                      </label>
                      <div
                        className="rounded-lg border px-3 py-2 text-sm"
                        style={{
                          background: "var(--color-bg-secondary)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {autoRate > 0 ? autoRate.toLocaleString(locale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        }) : t("missingRate")}
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-xs mb-1"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {t("manualRate")}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{
                          background: "var(--color-bg)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text-primary)",
                        }}
                        placeholder={t("manualRatePlaceholder")}
                        value={manualRate ? String(manualRate).replace(".", ",") : ""}
                        onChange={(e) => setManualRate(currency, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <FortnoxStatusCard />

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={handleSave}
            >
              {t("saveSettings")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
