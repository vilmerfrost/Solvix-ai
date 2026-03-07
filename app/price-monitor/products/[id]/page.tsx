"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { Button, Skeleton, useToast } from "@/components/ui/index";
import { PriceChart } from "@/components/price-monitor/price-chart";
import { AlertActions } from "@/components/price-monitor/alert-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  PriceHistory,
  Alert,
  formatCurrencyValue,
  formatSEK,
  formatPercent,
  formatDate,
} from "@/lib/price-monitor-api";

interface DocumentHeader {
  id: string;
  sender_name: string | null;
  document_date: string | null;
  total_cost: number | null;
  extracted_data: {
    currency?: string | null;
    total_amount_original?: number | null;
    exchange_rate_to_sek?: number | null;
  } | null;
}

interface ProductLineItem {
  document_id: string;
  raw_description: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  match_confidence: number | null;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("products");
  const { addToast } = useToast();
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [documentHeaders, setDocumentHeaders] = useState<Record<string, DocumentHeader>>({});
  const [lineItemsByDocument, setLineItemsByDocument] = useState<Record<string, ProductLineItem[]>>({});
  const [deleting, setDeleting] = useState(false);
  const [monthFilter, setMonthFilter] = useState("all");
  const [compareLeftDocumentId, setCompareLeftDocumentId] = useState<string>("");
  const [compareRightDocumentId, setCompareRightDocumentId] = useState<string>("");

  const product = history[0];

  const load = useCallback(async () => {
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

      const documentIds = [...new Set(hist.map((row) => row.document_id))];
      if (documentIds.length > 0) {
        const [{ data: docs, error: docsError }, { data: productLines, error: linesError }] =
          await Promise.all([
            supabase
              .from("documents")
              .select("id, sender_name, document_date, total_cost, extracted_data")
              .in("id", documentIds),
            supabase
              .from("invoice_line_items")
              .select("document_id, raw_description, quantity, unit_price, amount, invoice_number, invoice_date, match_confidence")
              .eq("product_id", id)
              .in("document_id", documentIds),
          ]);

        if (docsError) throw docsError;
        if (linesError) throw linesError;

        const docMap = (docs ?? []).reduce<Record<string, DocumentHeader>>((acc, doc) => {
          acc[doc.id] = doc as DocumentHeader;
          return acc;
        }, {});
        const linesMap = (productLines ?? []).reduce<Record<string, ProductLineItem[]>>(
          (acc, row) => {
            const key = row.document_id as string;
            acc[key] = [...(acc[key] ?? []), row as ProductLineItem];
            return acc;
          },
          {}
        );

        setDocumentHeaders(docMap);
        setLineItemsByDocument(linesMap);
      } else {
        setDocumentHeaders({});
        setLineItemsByDocument({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch price history.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  async function handleDeleteProduct() {
    const confirmed = window.confirm(t("deleteConfirm"));
    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/price-monitor/products/${id}`, {
        method: "DELETE",
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error || t("deleteError"));
      }

      addToast({ type: "success", title: t("deleteSuccess") });
      router.push("/price-monitor/products");
    } catch (deleteError) {
      addToast({
        type: "error",
        title: t("deleteError"),
        description: deleteError instanceof Error ? deleteError.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  const sorted = [...history].sort(
    (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
  );
  const monthOptions = useMemo(() => {
    const months = new Set(
      sorted
        .map((row) => row.invoice_date?.slice(0, 7))
        .filter((month): month is string => Boolean(month))
    );
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [sorted]);

  const filteredByMonth = useMemo(() => {
    if (monthFilter === "all") return sorted;
    return sorted.filter((row) => row.invoice_date?.startsWith(monthFilter));
  }, [monthFilter, sorted]);

  const groupedHistory = filteredByMonth.reduce<Record<string, PriceHistory[]>>((acc, row) => {
    acc[row.document_id] = [...(acc[row.document_id] ?? []), row];
    return acc;
  }, {});

  const groupedDocumentIds = useMemo(() => Object.keys(groupedHistory), [groupedHistory]);

  useEffect(() => {
    if (groupedDocumentIds.length === 0) {
      setCompareLeftDocumentId("");
      setCompareRightDocumentId("");
      return;
    }

    const left = groupedDocumentIds[0];
    const right = groupedDocumentIds[1] ?? groupedDocumentIds[0];

    setCompareLeftDocumentId((prev) =>
      prev && groupedDocumentIds.includes(prev) ? prev : left
    );
    setCompareRightDocumentId((prev) =>
      prev && groupedDocumentIds.includes(prev) ? prev : right
    );
  }, [groupedDocumentIds]);

  function getDocumentRows(documentId: string): ProductLineItem[] {
    return lineItemsByDocument[documentId] ?? [];
  }

  function getDocumentSummary(documentId: string | null) {
    if (!documentId) return null;

    const rows = getDocumentRows(documentId);
    if (rows.length === 0) return null;

    const total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const count = rows.length;
    const header = documentHeaders[documentId];
    const date = header?.document_date ?? rows[0].invoice_date ?? null;
    const invoiceNumber = rows[0].invoice_number ?? null;

    return { total, count, date, invoiceNumber };
  }

  const compareLeft = getDocumentSummary(compareLeftDocumentId || null);
  const compareRight = getDocumentSummary(compareRightDocumentId || null);
  const compareDelta =
    compareLeft && compareRight ? compareRight.total - compareLeft.total : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/price-monitor/products")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToProducts")}
      </button>

      {/* Header */}
      {loading ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : product ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {product.product_name}
            </h1>
            <p className="text-sm mt-1 text-gray-500">
              {product.supplier_name}
              {product.product_unit && ` · ${product.product_unit}`}
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
            loading={deleting}
            onClick={handleDeleteProduct}
          >
            {t("deleteProduct")}
          </Button>
        </div>
      ) : (
        <p style={{ color: "var(--color-text-muted)" }}>{t("detailNotFound")}</p>
      )}

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
        >
          {error}
        </p>
      )}

      {/* Price chart */}
      <section>
        <h2 className="font-semibold text-base mb-4 text-gray-900">
          Prisutveckling
        </h2>
        <div
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
        >
          {loading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : history.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-gray-500">
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-base text-gray-900">
            Fakturarader
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Månad</span>
            <select
              className="bg-white rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="all">Alla</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : filteredByMonth.length === 0 ? (
          <p className="text-sm text-gray-500">
            Inga fakturarader hittades
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedHistory).map(([documentId, rows]) => {
              const header = documentHeaders[documentId];
              const originalTotal =
                header?.extracted_data?.total_amount_original ?? null;
              const originalCurrency =
                header?.extracted_data?.currency ?? "SEK";

              return (
                <div
                  key={documentId}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {header?.sender_name ?? product?.supplier_name ?? "Okänd leverantör"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(header?.document_date ?? rows[0].invoice_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {originalTotal != null
                          ? formatCurrencyValue(originalTotal, originalCurrency)
                          : header?.total_cost != null
                            ? formatSEK(header.total_cost)
                            : "Total saknas"}
                      </p>
                      {header?.total_cost != null && originalCurrency !== "SEK" ? (
                        <p className="text-xs text-gray-500">
                          {formatSEK(header.total_cost)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead className="bg-white border-b border-gray-100">
                      <tr>
                        {["Beskrivning", "Fakturadatum", "Faktura #", "Enhetspris", "Antal", "Totalbelopp", "Matchning"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-500"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(lineItemsByDocument[documentId] ?? rows).map((row, idx) => (
                        <tr
                          key={`${documentId}-${row.invoice_date ?? "no-date"}-${idx}`}
                          className={`hover:bg-gray-50 transition-colors ${idx === (lineItemsByDocument[documentId] ?? rows).length - 1 ? '' : 'border-b border-gray-100'}`}
                        >
                          <td className="px-4 py-3 text-gray-900">
                            {("raw_description" in row ? row.raw_description : null) || product?.product_name || "Rad utan namn"}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {formatDate(row.invoice_date)}
                          </td>
                          <td className="px-4 py-3">
                            {row.invoice_number ? (
                              <Link
                                href={`/price-monitor/review/${row.document_id}`}
                                className="font-medium text-pink-500 hover:text-pink-600 hover:underline"
                              >
                                {row.invoice_number}
                              </Link>
                            ) : (
                              <span className="text-gray-400">–</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatSEK(row.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {row.quantity}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatSEK(row.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <ConfidenceBadge value={Number(row.match_confidence ?? 0)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {!loading && groupedDocumentIds.length > 0 && (
        <section>
          <h2 className="font-semibold text-base mb-4 text-gray-900">
            Fakturajämförelse (head-to-head)
          </h2>
          <div
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-gray-500">
                  Faktura A
                </span>
                <select
                  className="w-full bg-white rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                  value={compareLeftDocumentId}
                  onChange={(event) => setCompareLeftDocumentId(event.target.value)}
                >
                  {groupedDocumentIds.map((docId) => {
                    const header = documentHeaders[docId];
                    const rows = groupedHistory[docId] ?? [];
                    const date = header?.document_date ?? rows[0]?.invoice_date;
                    return (
                      <option key={docId} value={docId}>
                        {date ? formatDate(date) : docId} · {docId.slice(0, 8)}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-gray-500">
                  Faktura B
                </span>
                <select
                  className="w-full bg-white rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                  value={compareRightDocumentId}
                  onChange={(event) => setCompareRightDocumentId(event.target.value)}
                >
                  {groupedDocumentIds.map((docId) => {
                    const header = documentHeaders[docId];
                    const rows = groupedHistory[docId] ?? [];
                    const date = header?.document_date ?? rows[0]?.invoice_date;
                    return (
                      <option key={docId} value={docId}>
                        {date ? formatDate(date) : docId} · {docId.slice(0, 8)}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div
                className="rounded-lg border border-gray-200 px-4 py-3"
              >
                <p className="text-xs text-gray-500">
                  Faktura A total
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {compareLeft ? formatSEK(compareLeft.total) : "–"}
                </p>
              </div>
              <div
                className="rounded-lg border border-gray-200 px-4 py-3"
              >
                <p className="text-xs text-gray-500">
                  Faktura B total
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {compareRight ? formatSEK(compareRight.total) : "–"}
                </p>
              </div>
              <div
                className="rounded-lg border border-gray-200 px-4 py-3"
              >
                <p className="text-xs text-gray-500">
                  Skillnad (B - A)
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${compareDelta == null ? 'text-gray-900' : compareDelta > 0 ? 'text-red-500' : compareDelta < 0 ? 'text-emerald-500' : 'text-gray-900'}`}
                >
                  {compareDelta == null ? "–" : formatSEK(compareDelta)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Alerts for this product */}
      {!loading && alerts.length > 0 && session && (
        <section>
          <h2 className="font-semibold text-base mb-4 text-gray-900">
            Prisvarningar
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.change_percent > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}
                    >
                      {alert.change_percent > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)}{" "}
                        <span
                          className={`font-semibold ${alert.change_percent > 0 ? 'text-red-500' : 'text-emerald-500'}`}
                        >
                          ({formatPercent(alert.change_percent)})
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Priset ändrades mellan {formatDate(alert.previous_invoice_date)} och{" "}
                        {formatDate(alert.new_invoice_date)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {alert.previous_document_id ? (
                          <Link
                            href={`/price-monitor/review/${alert.previous_document_id}`}
                            className="text-pink-500 hover:text-pink-600 hover:underline"
                          >
                            Se föregående faktura
                          </Link>
                        ) : null}
                        {alert.new_document_id ? (
                          <Link
                            href={`/price-monitor/review/${alert.new_document_id}`}
                            className="text-pink-500 hover:text-pink-600 hover:underline"
                          >
                            Se ny faktura
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <AlertActions
                    alert={alert}
                    session={session}
                    comparisonHref="/price-monitor/spend/compare"
                    onUpdated={(alertId, newStatus) => {
                      setAlerts((prev) =>
                        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
                      );
                    }}
                  />
                </div>
                {alert.notes && (
                  <p
                    className="mt-2 text-xs px-3 py-1.5 rounded-md bg-gray-50 text-gray-600 border border-gray-100"
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
  let badgeClass = "bg-red-50 text-red-600 border-red-200";
  if (pct >= 90) badgeClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
  else if (pct >= 70) badgeClass = "bg-amber-50 text-amber-600 border-amber-200";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
    >
      {pct}%
    </span>
  );
}
