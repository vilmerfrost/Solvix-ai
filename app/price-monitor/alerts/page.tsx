"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Alla" },
  { id: "new", label: "Ny" },
  { id: "reviewed", label: "Granskad" },
  { id: "dismissed", label: "Avfärdad" },
  { id: "actioned", label: "Åtgärdad" },
];

export default function AlertsPage() {
  const router = useRouter();
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  async function load() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s);

    try {
      const data = await fetchDashboard<Alert[]>("alerts", undefined, s);
      setAllAlerts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta varningar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (activeTab === "all") return allAlerts;
    return allAlerts.filter((a) => a.status === activeTab);
  }, [allAlerts, activeTab]);

  const newAlerts = filtered.filter((a) => a.status === "new");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Varningar
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Prisförändringar som kräver uppmärksamhet
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "var(--color-bg-secondary)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelected(new Set()); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "var(--color-bg-elevated)" : "transparent",
              color:
                activeTab === tab.id
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)",
              boxShadow: activeTab === tab.id ? "var(--shadow-sm)" : "none",
            }}
          >
            {tab.label}
            {tabCounts[tab.id] !== undefined && (
              <span
                className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background:
                    activeTab === tab.id
                      ? "var(--color-accent-muted)"
                      : "var(--color-bg-inset)",
                  color:
                    activeTab === tab.id
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                }}
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
            {selected.size === newAlerts.length ? "Avmarkera alla" : "Markera alla nya"}
          </button>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="secondary"
              loading={bulkLoading}
              onClick={bulkDismiss}
            >
              Avfärda {selected.size} markerade
            </Button>
          )}
        </div>
      )}

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "#fef2f2", color: "#ef4444" }}
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
          className="rounded-xl border p-12 text-center"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border)",
          }}
        >
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
          <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
            Inga prisvarningar
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Alla priser är stabila
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
  const increase = alert.change_percent > 0;

  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: selected ? "var(--color-accent)" : "var(--color-border)",
        outline: selected ? "2px solid var(--color-accent)" : "none",
        outlineOffset: -1,
      }}
    >
      <div className="flex flex-wrap items-start gap-3">
        {/* Checkbox (only for new alerts) */}
        {alert.status === "new" && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 w-4 h-4 cursor-pointer rounded flex-shrink-0"
            style={{ accentColor: "var(--color-accent)" }}
          />
        )}

        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: increase ? "#fef2f2" : "#f0fdf4" }}
        >
          {increase ? (
            <TrendingUp className="w-4 h-4" style={{ color: "#ef4444" }} />
          ) : (
            <TrendingDown className="w-4 h-4" style={{ color: "#22c55e" }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <button onClick={onNavigate} className="text-left">
            <p
              className="font-semibold text-sm hover:underline"
              style={{ color: "var(--color-text-primary)" }}
            >
              {alert.product_name}
            </p>
          </button>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {alert.supplier_name} · {formatDate(alert.new_invoice_date)}
          </p>
          <div className="flex items-center flex-wrap gap-3 mt-2">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: increase ? "#fef2f2" : "#f0fdf4",
                color: increase ? "#ef4444" : "#22c55e",
              }}
            >
              {increase && <TrendingUp className="w-3 h-3" />}
              {!increase && <TrendingDown className="w-3 h-3" />}
              {formatPercent(alert.change_percent)}
            </span>
          </div>
          {alert.notes && (
            <p
              className="mt-2 text-xs px-2.5 py-1.5 rounded-md"
              style={{
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-secondary)",
              }}
            >
              {alert.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          <AlertActions alert={alert} session={session} onUpdated={onUpdated} />
        </div>
      </div>
    </div>
  );
}
