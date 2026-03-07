"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, TrendingUp, TrendingDown, CheckSquare } from "lucide-react";
import { Button, Skeleton } from "@/components/ui/index";
import { AlertActions } from "@/components/price-monitor/alert-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  updateAlert,
  Alert,
  formatSEK,
  formatPercent,
  formatDate,
} from "@/lib/price-monitor-api";

type Tab = "all" | Alert["status"];

export default function AlertsPage() {
  const router = useRouter();
  const t = useTranslations("alerts");
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s);

    try {
      const data = await fetchDashboard<Alert[]>("alerts", undefined, s);
      setAllAlerts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: t("tabs.all") },
    { id: "new", label: t("tabs.new") },
    { id: "reviewed", label: t("tabs.reviewed") },
    { id: "dismissed", label: t("tabs.dismissed") },
    { id: "actioned", label: t("tabs.actioned") },
  ];

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return allAlerts;
    return allAlerts.filter((a) => a.status === activeTab);
  }, [allAlerts, activeTab]);

  const newAlerts = filtered.filter((a) => a.status === "new");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === newAlerts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(newAlerts.map((a) => a.id)));
    }
  }

  async function bulkDismiss() {
    if (!session || selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        [...selected].map((id) => updateAlert(id, "dismissed", null, session))
      );
      setAllAlerts((prev) =>
        prev.map((a) => (selected.has(a.id) ? { ...a, status: "dismissed" as const } : a))
      );
      setSelected(new Set());
    } finally {
      setBulkLoading(false);
    }
  }

  function handleUpdated(alertId: string, newStatus: Alert["status"]) {
    setAllAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    );
  }

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allAlerts.length };
    allAlerts.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    return counts;
  }, [allAlerts]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("title")}
        </h1>
        <p className="text-sm mt-0.5 text-gray-500">
          {t("description")}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit bg-gray-100"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelected(new Set()); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            {tabCounts[tab.id] !== undefined && (
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-pink-50 text-pink-600"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {newAlerts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <CheckSquare className="w-4 h-4" />
            {selected.size === newAlerts.length ? t("clearSelection") : t("selectAll")}
          </button>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="secondary"
              loading={bulkLoading}
              onClick={bulkDismiss}
            >
              {t("dismissSelected", { count: selected.size })}
            </Button>
          )}
        </div>
      )}

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
        >
          {error}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center"
        >
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="font-medium text-sm text-gray-900">
            {t("emptyTitle")}
          </p>
          <p className="text-xs mt-1 text-gray-500">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              session={session!}
              selected={selected.has(alert.id)}
              onToggleSelect={() => toggleSelect(alert.id)}
              onUpdated={handleUpdated}
              onNavigate={() =>
                router.push(`/price-monitor/products/${alert.product_id}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  session,
  selected,
  onToggleSelect,
  onUpdated,
  onNavigate,
}: {
  alert: Alert;
  session: { access_token: string };
  selected: boolean;
  onToggleSelect: () => void;
  onUpdated: (id: string, status: Alert["status"]) => void;
  onNavigate: () => void;
}) {
  const t = useTranslations("alerts");
  const increase = alert.change_percent > 0;

  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-all ${selected ? 'border-pink-500 ring-1 ring-pink-500' : 'border-gray-200 hover:border-pink-200 shadow-sm'}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {/* Checkbox (only for new alerts) */}
        {alert.status === "new" && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 w-4 h-4 cursor-pointer rounded flex-shrink-0 accent-pink-500"
          />
        )}

        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${increase ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}
        >
          {increase ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <button onClick={onNavigate} className="text-left">
            <p
              className="font-semibold text-sm hover:underline text-gray-900"
            >
              {alert.product_name}
            </p>
          </button>
          <p className="text-xs mt-0.5 text-gray-500">
            {alert.supplier_name} · {formatDate(alert.new_invoice_date)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t("changedBetween", {
              from: formatDate(alert.previous_invoice_date),
              to: formatDate(alert.new_invoice_date)
            })}
          </p>
          <div className="flex items-center flex-wrap gap-3 mt-2">
            <span className="text-sm text-gray-500">
              {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${increase ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}
            >
              {increase && <TrendingUp className="w-3 h-3" />}
              {!increase && <TrendingDown className="w-3 h-3" />}
              {formatPercent(alert.change_percent)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {alert.previous_document_id ? (
              <Link
                href={`/price-monitor/review/${alert.previous_document_id}`}
                className="text-pink-500 hover:text-pink-600 hover:underline"
              >
                {t("viewPreviousInvoice")}
              </Link>
            ) : null}
            {alert.new_document_id ? (
              <Link
                href={`/price-monitor/review/${alert.new_document_id}`}
                className="text-pink-500 hover:text-pink-600 hover:underline"
              >
                {t("viewNewInvoice")}
              </Link>
            ) : null}
          </div>
          {alert.notes && (
            <p
              className="mt-2 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 border border-gray-100"
            >
              {alert.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          <AlertActions
            alert={alert}
            session={session}
            onUpdated={onUpdated}
            comparisonHref="/price-monitor/spend/compare"
          />
        </div>
      </div>
    </div>
  );
}
