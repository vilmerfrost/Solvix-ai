"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Bell, Mail, Percent } from "lucide-react";
import { Button, Skeleton, useToast } from "@/components/ui/index";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  saveSettings,
  PriceMonitorSettings,
} from "@/lib/price-monitor-api";

export default function PriceMonitorSettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [settings, setSettings] = useState<PriceMonitorSettings>({
    alert_threshold_percent: 5.0,
    auto_alert: true,
    notify_email: null,
  });

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

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    try {
      await saveSettings(settings, session);
      addToast({ type: "success", title: "Inställningar sparade" });
    } catch (e) {
      addToast({
        type: "error",
        title: "Kunde inte spara",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Inställningar
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Konfigurera prisövervakning och aviseringar
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
                  Varningströskel
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Generera en varning när priset förändras med mer än X%
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
                    Automatiska varningar
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Skapa varningar automatiskt vid fakturaimport
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
                  E-postavisering
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Skicka e-post vid nya prisvarningar (valfritt)
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
              placeholder="din@epost.se"
              value={settings.notify_email ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  notify_email: e.target.value || null,
                }))
              }
            />
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={handleSave}
            >
              Spara inställningar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
