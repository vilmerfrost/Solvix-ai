"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button, Skeleton } from "@/components/ui/index";
import { PriceChart } from "@/components/price-monitor/price-chart";
import { AlertActions } from "@/components/price-monitor/alert-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  PriceHistory,
  Alert,
  formatSEK,
  formatPercent,
  formatDate,
} from "@/lib/price-monitor-api";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ access_token: string } | null>(null);

  const product = history[0];

  async function load() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s);

    try {
      const [hist, allAlerts] = await Promise.all([
        fetchDashboard<PriceHistory[]>("price_history", { product_id: id }, s),
        fetchDashboard<Alert[]>("alerts", undefined, s),
      ]);
      setHistory(hist);
      setAlerts(allAlerts.filter((a) => a.product_id === id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta prishistorik.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const sorted = [...history].sort(
    (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/price-monitor/products")}
        className="flex items-center gap-1.5 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Tillbaka till produkter
      </button>

      {/* Header */}
      {loading ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : product ? (
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {product.product_name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {product.supplier_name}
            {product.product_unit && ` · ${product.product_unit}`}
          </p>
        </div>
      ) : (
        <p style={{ color: "var(--color-text-muted)" }}>Produkt hittades inte</p>
      )}

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "#fef2f2", color: "#ef4444" }}
        >
          {error}
        </p>
      )}

      {/* Price chart */}
      <section>
        <h2 className="font-semibold text-base mb-4" style={{ color: "var(--color-text-primary)" }}>
          Prisutveckling
        </h2>
        <div
          className="rounded-xl border p-5"
          style={{
            background: "var(--color-bg-elevated)",
            borderColor: "var(--color-border)",
          }}
        >
          {loading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : history.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Ingen prishistorik tillgänglig
              </p>
            </div>
          ) : (
            <PriceChart data={history} />
          )}
        </div>
      </section>

      {/* Price history table */}
      <section>
        <h2 className="font-semibold text-base mb-4" style={{ color: "var(--color-text-primary)" }}>
          Fakturarader
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Inga fakturarader hittades
          </p>
        ) : (
          <div
            className="rounded-xl border overflow-x-auto"
            style={{ borderColor: "var(--color-border)" }}
          >
            <table className="w-full text-sm" style={{ background: "var(--color-bg-elevated)" }}>
              <thead
                style={{
                  background: "var(--color-bg-secondary)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <tr>
                  {["Fakturadatum", "Faktura #", "Enhetspris", "Antal", "Totalbelopp", "Matchning"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-medium text-left whitespace-nowrap"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => (
                  <tr
                    key={`${row.document_id}-${row.invoice_date}`}
                    style={{
                      borderBottom:
                        idx === sorted.length - 1
                          ? "none"
                          : "1px solid var(--color-border)",
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                      {formatDate(row.invoice_date)}
                    </td>
                    <td className="px-4 py-3">
                      {row.invoice_number ? (
                        <Link
                          href={`/price-monitor/review/${row.document_id}`}
                          className="hover:underline font-medium"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {row.invoice_number}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>–</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatSEK(row.unit_price)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                      {row.quantity}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                      {formatSEK(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge value={row.match_confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Alerts for this product */}
      {!loading && alerts.length > 0 && session && (
        <section>
          <h2 className="font-semibold text-base mb-4" style={{ color: "var(--color-text-primary)" }}>
            Prisvarningar
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border p-4"
                style={{
                  background: "var(--color-bg-elevated)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#fef2f2" }}
                    >
                      {alert.change_percent > 0 ? (
                        <TrendingUp className="w-4 h-4" style={{ color: "#ef4444" }} />
                      ) : (
                        <TrendingDown className="w-4 h-4" style={{ color: "#22c55e" }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)}{" "}
                        <span
                          className="font-semibold"
                          style={{ color: alert.change_percent > 0 ? "#ef4444" : "#22c55e" }}
                        >
                          ({formatPercent(alert.change_percent)})
                        </span>
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatDate(alert.previous_invoice_date)} → {formatDate(alert.new_invoice_date)}
                      </p>
                    </div>
                  </div>
                  <AlertActions
                    alert={alert}
                    session={session}
                    onUpdated={(alertId, newStatus) => {
                      setAlerts((prev) =>
                        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
                      );
                    }}
                  />
                </div>
                {alert.notes && (
                  <p
                    className="mt-2 text-xs px-3 py-1.5 rounded-md"
                    style={{
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {alert.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}18`, color }}
    >
      {pct}%
    </span>
  );
}
