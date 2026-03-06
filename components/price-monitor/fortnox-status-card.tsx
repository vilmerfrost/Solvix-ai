"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Unplug } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, useToast } from "@/components/ui/index";

interface FortnoxStatusResponse {
  connected: boolean;
  connection: {
    fortnox_company_name: string | null;
    fortnox_org_number: string | null;
    auto_sync: boolean;
    sync_from_date: string | null;
    last_sync_at: string | null;
  } | null;
  latestLog: {
    imported_count: number;
    skipped_count: number;
    failed_count: number;
  } | null;
}

export function FortnoxStatusCard() {
  const t = useTranslations("settings");
  const { addToast } = useToast();
  const [data, setData] = useState<FortnoxStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/fortnox/status");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("statusError"));
      }
      setData(body);
    } catch (error) {
      addToast({
        type: "error",
        title: t("fortnoxTitle"),
        description: error instanceof Error ? error.message : t("statusError"),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function syncNow() {
    setSaving(true);
    try {
      const response = await fetch("/api/fortnox/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ syncFromDate: data?.connection?.sync_from_date || null }) });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("syncError"));
      }
      addToast({
        type: "success",
        title: t("syncSuccess"),
        description: `Imported ${body.imported}, skipped ${body.skipped}, failed ${body.failed}.`,
      });
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: t("fortnoxTitle"),
        description: error instanceof Error ? error.message : t("syncError"),
      });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setSaving(true);
    try {
      const response = await fetch("/api/fortnox/disconnect", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("disconnectError"));
      }
      addToast({ type: "success", title: t("disconnectSuccess") });
      await load();
    } catch (error) {
      addToast({
        type: "error",
        title: t("fortnoxTitle"),
        description: error instanceof Error ? error.message : t("disconnectError"),
      });
    } finally {
      setSaving(false);
    }
  }

  async function updateSettings(next: { autoSync?: boolean; syncFromDate?: string | null }) {
    setSaving(true);
    try {
      const response = await fetch("/api/fortnox/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoSync: next.autoSync ?? data?.connection?.auto_sync ?? true,
          syncFromDate: next.syncFromDate ?? data?.connection?.sync_from_date ?? null,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("statusError"));
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              connection: prev.connection
                ? {
                    ...prev.connection,
                    auto_sync: body.connection?.auto_sync ?? prev.connection.auto_sync,
                    sync_from_date: body.connection?.sync_from_date ?? prev.connection.sync_from_date,
                  }
                : prev.connection,
            }
          : prev
      );
    } catch (error) {
      addToast({
        type: "error",
        title: t("fortnoxTitle"),
        description: error instanceof Error ? error.message : t("statusError"),
      });
    } finally {
      setSaving(false);
    }
  }

  const connected = Boolean(data?.connected);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {t("fortnoxTitle")}
        </p>
        {!connected && (
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("fortnoxDescription")}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("description")}
        </p>
      ) : !connected ? (
        <Button variant="primary" onClick={() => (window.location.href = "/api/fortnox/connect")}>
          {t("connectFortnox")}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1 text-sm">
            <p style={{ color: "var(--color-text-primary)" }}>
              {t("fortnoxConnected")} · {data?.connection?.fortnox_company_name || "-"}
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              {t("orgNumber")}: {data?.connection?.fortnox_org_number || "-"}
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              {t("lastSync")}: {data?.connection?.last_sync_at || "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<RefreshCw className="h-4 w-4" />}
              loading={saving}
              onClick={syncNow}
            >
              {t("syncNow")}
            </Button>
            <Button
              variant="danger"
              icon={<Unplug className="h-4 w-4" />}
              loading={saving}
              onClick={disconnect}
            >
              {t("disconnect")}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-primary)" }}>
              <input
                type="checkbox"
                checked={Boolean(data?.connection?.auto_sync)}
                onChange={(event) => updateSettings({ autoSync: event.target.checked })}
              />
              {t("autoSync")}
            </label>

            <label className="text-sm" style={{ color: "var(--color-text-primary)" }}>
              <span className="mb-2 block">{t("syncFrom")}</span>
              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
                value={data?.connection?.sync_from_date || ""}
                onChange={(event) => updateSettings({ syncFromDate: event.target.value || null })}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
