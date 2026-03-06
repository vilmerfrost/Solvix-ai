"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  AlertTriangle,
  Upload,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { Button, Skeleton } from "@/components/ui/index";
import { AlertBanner } from "@/components/price-monitor/alert-banner";
import { InvoiceUploadModal } from "@/components/price-monitor/invoice-upload-modal";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  DashboardOverview,
  Alert,
  formatSEK,
  formatDate,
  formatPercent,
} from "@/lib/price-monitor-api";

export default function PriceMonitorDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s as { access_token: string; user: { id: string } });

    try {
      const data = await fetchDashboard<DashboardOverview>("overview", undefined, s);
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const stats = [
    {
      label: "Spårade produkter",
      value: overview?.product_count ?? 0,
      icon: Package,
      color: "var(--color-accent)",
    },
    {
      label: "Leverantörer",
      value: overview?.supplier_count ?? 0,
      icon: Truck,
      color: "#8b5cf6",
    },
    {
      label: "Öppna varningar",
      value: overview?.open_alerts ?? 0,
      icon: AlertTriangle,
      color: overview && overview.open_alerts > 0 ? "#ef4444" : "var(--color-success)",
      alert: (overview?.open_alerts ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Prisövervakning
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Övervaka prisutveckling för era produkter och leverantörer
          </p>
        </div>
        <div className="flex gap-2">
          {session && (
            <Button
              variant="primary"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => setShowUpload(true)}
            >
              Ladda upp faktura
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border p-5"
              style={{
                background: "var(--color-bg-elevated)",
                borderColor: s.alert ? "#fca5a5" : "var(--color-border)",
              }}
            >
              {loading ? (
                <Skeleton className="h-16" />
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${s.color}18` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>
                      {s.value}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {s.label}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>
          {error}
        </p>
      )}

      {overview?.recent_alerts?.length ? (
        <AlertBanner alerts={overview.recent_alerts} />
      ) : null}

      {/* Recent alerts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base" style={{ color: "var(--color-text-primary)" }}>
            Senaste varningar
          </h2>
          <button
            onClick={() => router.push("/price-monitor/alerts")}
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--color-accent)" }}
          >
            Visa alla <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : !overview?.recent_alerts?.length ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border)",
            }}
          >
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Inga prisvarningar — alla priser är stabila
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            {overview.recent_alerts.slice(0, 10).map((alert: Alert, idx: number) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                last={idx === Math.min(overview.recent_alerts.length, 10) - 1}
                onClick={() =>
                  router.push(
                    alert.new_document_id
                      ? `/price-monitor/review/${alert.new_document_id}`
                      : `/price-monitor/products/${alert.product_id}`
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-semibold text-base mb-4" style={{ color: "var(--color-text-primary)" }}>
          Snabbåtgärder
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {session && (
            <QuickAction
              icon={<Upload className="w-5 h-5" />}
              title="Ladda upp faktura"
              desc="Analysera en ny faktura och uppdatera prishistorik"
              onClick={() => setShowUpload(true)}
            />
          )}
          <QuickAction
            icon={<Package className="w-5 h-5" />}
            title="Se alla produkter"
            desc="Bläddra bland spårade produkter och prisförändringar"
            onClick={() => router.push("/price-monitor/products")}
          />
        </div>
      </section>

      {/* Upload modal */}
      {showUpload && session && (
        <InvoiceUploadModal
          session={session}
          onClose={() => setShowUpload(false)}
          onProcessed={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

function AlertRow({
  alert,
  last,
  onClick,
}: {
  alert: Alert;
  last: boolean;
  onClick: () => void;
}) {
  const increase = alert.change_percent > 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-opacity-50"
      style={{
        background: "var(--color-bg-elevated)",
        borderBottom: last ? "none" : `1px solid var(--color-border)`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: increase ? "#fef2f2" : "#f0fdf4" }}
      >
        {increase ? (
          <TrendingUp className="w-4 h-4" style={{ color: "#ef4444" }} />
        ) : (
          <TrendingDown className="w-4 h-4" style={{ color: "#22c55e" }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
          {alert.product_name}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {alert.supplier_name} · {formatDate(alert.new_invoice_date)}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold" style={{ color: increase ? "#ef4444" : "#22c55e" }}>
          {formatPercent(alert.change_percent)}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)}
        </p>
      </div>

      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
    </button>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border p-5 text-left transition-all hover:shadow-md"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--color-accent-muted)", color: "var(--color-accent)" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {desc}
        </p>
      </div>
    </button>
  );
}
