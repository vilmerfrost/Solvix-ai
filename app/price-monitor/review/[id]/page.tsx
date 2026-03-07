"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Button, Skeleton, useToast } from "@/components/ui/index";
import { PdfViewer } from "@/components/price-monitor/pdf-viewer";
import {
  InvoiceForm,
  InvoiceFormData,
  defaultInvoiceFormData,
  numToSE,
  parseSENum,
} from "@/components/price-monitor/invoice-form";
import {
  LineItemsEditor,
  LineItemForm,
  emptyLineItem,
} from "@/components/price-monitor/line-items-editor";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  formatSEK,
  formatPercent,
  formatDate,
  getDefaultPriceMonitorSettings,
  type PriceMonitorSettings,
} from "@/lib/price-monitor-api";
import {
  convertAmountToSek,
  getFxSnapshot,
  normalizeCurrency,
} from "@/lib/price-monitor-currency";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceDocument {
  id: string;
  user_id: string;
  storage_path: string | null;
  filename: string | null;
  extracted_data: ExtractedData | null;
  status: string;
  sender_name: string | null;
}

interface ExtractedData {
  supplier?: { name?: string; org_number?: string | null };
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
  vat_amount?: number | null;
  currency?: string;
  total_amount_original?: number | null;
  total_amount_sek?: number | null;
  vat_amount_original?: number | null;
  vat_amount_sek?: number | null;
  exchange_rate_to_sek?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  exchange_rate_manual_override?: boolean;
  line_items?: RawLineItem[];
}

interface RawLineItem {
  description: string;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: number | null;
  amount?: number | null;
  vat_rate?: number | null;
  matched_product?: string | null;
  match_confidence?: number;
  is_new_product?: boolean;
  product_id?: string | null;
  unit_price_original?: number | null;
  amount_original?: number | null;
  unit_price_sek?: number | null;
  amount_sek?: number | null;
}

interface DbLineItem {
  id: string;
  supplier_id: string;
  product_id: string | null;
  raw_description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  amount: number | null;
  vat_rate: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  match_confidence: number;
  manually_verified: boolean;
}

interface PriceAlert {
  id: string;
  product_id: string;
  previous_price: number;
  new_price: number;
  change_percent: number;
  previous_invoice_date: string;
  new_invoice_date: string;
  status: string;
  products?: { name: string; unit: string | null } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractedToForm(ed: ExtractedData | null): InvoiceFormData {
  if (!ed) return defaultInvoiceFormData();
  return {
    supplier_name: ed.supplier?.name ?? "",
    supplier_org_number: ed.supplier?.org_number ?? "",
    invoice_number: ed.invoice_number ?? "",
    invoice_date: ed.invoice_date ?? "",
    due_date: ed.due_date ?? "",
    total_amount: numToSE(ed.total_amount_original ?? ed.total_amount ?? null),
    vat_amount: numToSE(ed.vat_amount_original ?? ed.vat_amount ?? null),
    currency: ed.currency ?? "SEK",
  };
}

function rawToFormItem(item: RawLineItem): LineItemForm {
  return {
    description: item.description ?? "",
    quantity: item.quantity != null ? String(item.quantity).replace(".", ",") : "",
    unit: item.unit ?? "",
    unit_price: numToSE(item.unit_price_original ?? item.unit_price ?? null),
    amount: numToSE(item.amount_original ?? item.amount ?? null),
    vat_rate: item.vat_rate != null ? String(item.vat_rate).replace(".", ",") : "",
    matched_product: item.matched_product ?? null,
    match_confidence: item.match_confidence ?? 0,
    is_new_product: item.is_new_product ?? false,
    product_id: item.product_id ?? null,
  };
}

function dbItemToFormItem(item: DbLineItem): LineItemForm {
  return {
    description: item.raw_description ?? "",
    quantity: item.quantity != null ? String(item.quantity).replace(".", ",") : "",
    unit: item.unit ?? "",
    unit_price: numToSE(item.unit_price ?? null),
    amount: numToSE(item.amount ?? null),
    vat_rate: item.vat_rate != null ? String(item.vat_rate).replace(".", ",") : "",
    matched_product: null,
    match_confidence: item.match_confidence ?? 0,
    is_new_product: false,
    product_id: item.product_id ?? null,
  };
}

function isIncludedLineItem(item: LineItemForm): boolean {
  const amount = parseSENum(item.amount);
  return amount != null && Math.abs(amount) < 0.01;
}

function normalizeProductLabel(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function collapseBundledLineItems(
  items: LineItemForm[],
  dbItems: DbLineItem[]
): { items: LineItemForm[]; changed: boolean } {
  if (items.length < 2) {
    return { items, changed: false };
  }

  const paidIndexes = items
    .map((item, index) => ({
      index,
      amount: parseSENum(item.amount) ?? 0,
    }))
    .filter((item) => item.amount > 0.01)
    .map((item) => item.index);

  const includedIndexes = items
    .map((item, index) => (isIncludedLineItem(item) ? index : -1))
    .filter((index) => index >= 0);

  if (paidIndexes.length !== 1 || includedIndexes.length === 0) {
    return { items, changed: false };
  }

  const parentIndex = paidIndexes[0];
  const parentItem = items[parentIndex];
  const parentDbItem = dbItems[parentIndex];
  const parentProductId = parentItem.product_id ?? parentDbItem?.product_id ?? null;
  const parentLabel = normalizeProductLabel(
    parentItem.matched_product ?? parentItem.description
  );

  if (!parentLabel) {
    return { items, changed: false };
  }

  let changed = false;
  const nextItems = items.map((item, index) => {
    if (index === parentIndex) {
      const nextItem = {
        ...item,
        matched_product: parentLabel,
      };

      if (nextItem.matched_product !== item.matched_product) {
        changed = true;
      }

      return nextItem;
    }

    if (!includedIndexes.includes(index)) {
      return item;
    }

    const nextItem = {
      ...item,
      matched_product: parentLabel,
      product_id: parentProductId,
      is_new_product: parentProductId ? false : item.is_new_product,
    };

    if (
      nextItem.matched_product !== item.matched_product ||
      nextItem.product_id !== item.product_id ||
      nextItem.is_new_product !== item.is_new_product
    ) {
      changed = true;
    }

    return nextItem;
  });

  return changed ? { items: nextItems, changed: true } : { items, changed: false };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();

  const [doc, setDoc] = useState<InvoiceDocument | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>(defaultInvoiceFormData());
  const [lineItems, setLineItems] = useState<LineItemForm[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [settings, setSettings] = useState<PriceMonitorSettings>(
    getDefaultPriceMonitorSettings()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"pdf" | "form">("form");
  const [dbLineItems, setDbLineItems] = useState<DbLineItem[]>([]);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }
    setUserId(session.user.id);

    try {
      const [{ data: docData }, { data: dbItems }, { data: alertsData }, priceMonitorSettings] =
        await Promise.all([
          supabase.from("documents").select("*").eq("id", id).single(),
          supabase.from("invoice_line_items").select("*").eq("document_id", id),
          supabase
            .from("price_alerts")
            .select("*, products(name, unit)")
            .eq("new_document_id", id)
            .order("created_at", { ascending: false }),
          fetchDashboard<PriceMonitorSettings>("settings", undefined, session).catch(
            () => getDefaultPriceMonitorSettings()
          ),
        ]);

      setSettings(priceMonitorSettings);
      setDbLineItems((dbItems as DbLineItem[]) ?? []);

      if (docData) {
        setDoc(docData as InvoiceDocument);

        // Populate form from extracted_data, falling back to DB line items
        const ed = docData.extracted_data as ExtractedData | null;
        setFormData(extractedToForm(ed));

        if (ed?.line_items?.length) {
          setLineItems(
            collapseBundledLineItems(
              ed.line_items.map(rawToFormItem),
              (dbItems as DbLineItem[]) ?? []
            ).items
          );
        } else if (dbItems?.length) {
          setLineItems(
            collapseBundledLineItems(
              (dbItems as DbLineItem[]).map(dbItemToFormItem),
              (dbItems as DbLineItem[]) ?? []
            ).items
          );
        }

        // PDF signed URL
        if (docData.storage_path) {
          const { data: urlData } = await supabase.storage
            .from("raw_documents")
            .createSignedUrl(docData.storage_path, 3600);
          setPdfUrl(urlData?.signedUrl ?? null);
        }
      }

      if (dbItems?.length) {
        setSupplierId((dbItems[0] as DbLineItem).supplier_id ?? null);
      }

      setAlerts((alertsData as PriceAlert[]) ?? []);
    } catch (err) {
      addToast({
        type: "error",
        title: "Kunde inte ladda faktura",
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(opts?: { approve?: boolean; reject?: boolean }) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !doc) return;

    setSaving(true);
    try {
      const normalizedLineItems = collapseBundledLineItems(
        lineItems,
        dbLineItems
      ).items;
      const normalizedCurrency = normalizeCurrency(formData.currency);
      const fxSnapshot = getFxSnapshot(normalizedCurrency, settings);

      if (!fxSnapshot.rate_to_sek) {
        throw new Error(
          `Saknar valutakurs for ${formData.currency}. Uppdatera Price Monitor-installningarna och forsok igen.`
        );
      }

      const totalAmountOriginal = parseSENum(formData.total_amount);
      const vatAmountOriginal = parseSENum(formData.vat_amount);

      // Build updated extracted_data
      const updatedExtracted: ExtractedData = {
        supplier: {
          name: formData.supplier_name,
          org_number: formData.supplier_org_number || null,
        },
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date || null,
        due_date: formData.due_date || null,
        total_amount: totalAmountOriginal,
        vat_amount: vatAmountOriginal,
        total_amount_original: totalAmountOriginal,
        total_amount_sek: convertAmountToSek(
          totalAmountOriginal,
          normalizedCurrency,
          settings
        ),
        vat_amount_original: vatAmountOriginal,
        vat_amount_sek: convertAmountToSek(
          vatAmountOriginal,
          normalizedCurrency,
          settings
        ),
        currency: normalizedCurrency,
        exchange_rate_to_sek: fxSnapshot.rate_to_sek,
        exchange_rate_source: fxSnapshot.source,
        exchange_rate_updated_at: fxSnapshot.updated_at,
        exchange_rate_manual_override: fxSnapshot.manual_override,
        line_items: normalizedLineItems.map((item) => {
          const unitPriceOriginal = parseSENum(item.unit_price);
          const amountOriginal = parseSENum(item.amount);

          return {
            description: item.description,
            quantity: parseSENum(item.quantity),
            unit: item.unit || null,
            unit_price: unitPriceOriginal,
            amount: amountOriginal,
            unit_price_original: unitPriceOriginal,
            amount_original: amountOriginal,
            unit_price_sek: convertAmountToSek(
              unitPriceOriginal,
              normalizedCurrency,
              settings
            ),
            amount_sek: convertAmountToSek(
              amountOriginal,
              normalizedCurrency,
              settings
            ),
            vat_rate: parseSENum(item.vat_rate),
            matched_product: item.matched_product,
            match_confidence: item.match_confidence,
            is_new_product: item.is_new_product,
            product_id: item.product_id,
          };
        }),
      };

      // Determine new status
      const newStatus = opts?.approve
        ? "approved"
        : opts?.reject
        ? "rejected"
        : undefined;

      const docUpdate: Record<string, unknown> = {
        extracted_data: updatedExtracted,
        sender_name: formData.supplier_name || null,
        document_date: formData.invoice_date || null,
        total_cost: updatedExtracted.total_amount_sek,
      };
      if (newStatus) docUpdate.status = newStatus;

      const { error: docErr } = await supabase
        .from("documents")
        .update(docUpdate)
        .eq("id", id);
      if (docErr) throw docErr;

      // Re-insert line items
      const { error: delErr } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("document_id", id);
      if (delErr) throw delErr;

      if (normalizedLineItems.length > 0) {
        const insertRows = normalizedLineItems.map((item, index) => {
          const sourceRow = dbLineItems[index];
          const unitPriceOriginal = parseSENum(item.unit_price);
          const amountOriginal = parseSENum(item.amount);

          return {
            user_id: userId,
            document_id: id,
            supplier_id: sourceRow?.supplier_id ?? supplierId,
            product_id: item.product_id ?? sourceRow?.product_id ?? null,
            raw_description: item.description,
            quantity: parseSENum(item.quantity),
            unit: item.unit || null,
            unit_price: convertAmountToSek(
              unitPriceOriginal,
              normalizedCurrency,
              settings
            ),
            amount: convertAmountToSek(
              amountOriginal,
              normalizedCurrency,
              settings
            ),
            vat_rate: parseSENum(item.vat_rate),
            invoice_number: formData.invoice_number || null,
            invoice_date: formData.invoice_date || null,
            match_confidence: item.match_confidence,
            manually_verified: true,
          };
        });

        const { error: insErr } = await supabase
          .from("invoice_line_items")
          .insert(insertRows);
        if (insErr) throw insErr;
      }

      setLineItems(normalizedLineItems);

      const toastTitle = opts?.approve
        ? "Faktura godkänd"
        : opts?.reject
        ? "Faktura avvisad"
        : "Ändringar sparade";

      addToast({ type: "success", title: toastTitle });

      if (opts?.approve || opts?.reject) {
        router.push("/price-monitor");
      }
    } catch (err) {
      addToast({
        type: "error",
        title: "Kunde inte spara",
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const supplierName =
    formData.supplier_name || doc?.sender_name || "Okänd leverantör";
  const invoiceNumber = formData.invoice_number || "–";
  const reviewCurrency = normalizeCurrency(formData.currency);
  const reviewFxSnapshot = getFxSnapshot(reviewCurrency, settings);
  const convertedTotalAmount = convertAmountToSek(
    parseSENum(formData.total_amount),
    reviewCurrency,
    settings
  );

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Sticky header */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b sticky top-0 z-10"
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/price-monitor")}
            className="flex items-center gap-1.5 text-sm flex-shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Tillbaka</span>
          </button>
          <div
            className="w-px h-4 flex-shrink-0"
            style={{ background: "var(--color-border)" }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
              {loading ? "Laddar…" : `Faktura: ${invoiceNumber}`}
            </p>
            {!loading && (
              <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                {supplierName}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<Save className="w-3.5 h-3.5" />}
            loading={saving}
            disabled={loading}
            onClick={() => handleSave()}
          >
            Spara ändringar
          </Button>
          <Button
            variant="success"
            size="sm"
            icon={<CheckCircle className="w-3.5 h-3.5" />}
            loading={saving}
            disabled={loading}
            onClick={() => handleSave({ approve: true })}
          >
            Godkänn
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<XCircle className="w-3.5 h-3.5" />}
            loading={saving}
            disabled={loading}
            onClick={() => handleSave({ reject: true })}
          >
            Avvisa
          </Button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div
        className="flex md:hidden border-b"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg-secondary)" }}
      >
        {(["form", "pdf"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className="flex-1 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: mobileTab === tab ? "var(--color-accent)" : "var(--color-text-muted)",
              borderBottom: mobileTab === tab ? "2px solid var(--color-accent)" : "2px solid transparent",
            }}
          >
            {tab === "form" ? "Extraherad data" : "Originalfaktura"}
          </button>
        ))}
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* PDF panel */}
        <div
          className={`md:flex md:flex-col md:w-1/2 border-r ${mobileTab === "pdf" ? "flex flex-col w-full" : "hidden"}`}
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="px-4 py-2 border-b text-xs font-medium flex-shrink-0"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            Originalfaktura
          </div>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="p-4">
                <Skeleton className="h-full rounded-lg" style={{ minHeight: 500 }} />
              </div>
            ) : (
              <PdfViewer url={pdfUrl} filename={doc?.filename} />
            )}
          </div>
        </div>

        {/* Form panel */}
        <div
          className={`md:flex md:flex-col md:w-1/2 overflow-y-auto ${mobileTab === "form" ? "flex flex-col w-full" : "hidden"}`}
          style={{ background: "var(--color-bg)" }}
        >
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="p-6 space-y-8">
              {/* Not processed notice */}
              {!doc?.extracted_data && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
                  style={{ background: "#fef3c7", color: "#92400e" }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Fakturan är ännu inte bearbetad. Fyll i uppgifterna manuellt.
                </div>
              )}

              {reviewCurrency !== "SEK" && (
                <div
                  className="rounded-xl border p-4 space-y-2"
                  style={{
                    background: "var(--color-bg-elevated)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Valutakonvertering
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {reviewFxSnapshot.source ?? "Okänd källa"}
                    </p>
                  </div>

                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    Originalfakturan är i {reviewCurrency}. Prisjämförelser och varningar
                    använder SEK-normaliserade värden.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div
                      className="rounded-lg border px-3 py-2"
                      style={{
                        background: "var(--color-bg)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <p style={{ color: "var(--color-text-muted)" }}>Använd kurs</p>
                      <p
                        className="font-medium mt-1"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {reviewFxSnapshot.rate_to_sek
                          ? `1 ${reviewCurrency} = ${formatSEK(reviewFxSnapshot.rate_to_sek)}`
                          : "Saknas"}
                      </p>
                    </div>

                    <div
                      className="rounded-lg border px-3 py-2"
                      style={{
                        background: "var(--color-bg)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <p style={{ color: "var(--color-text-muted)" }}>
                        Totalt för jämförelse
                      </p>
                      <p
                        className="font-medium mt-1"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {convertedTotalAmount != null
                          ? formatSEK(convertedTotalAmount)
                          : "Saknas"}
                      </p>
                    </div>
                  </div>

                  {reviewFxSnapshot.updated_at && (
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Uppdaterad {formatDate(reviewFxSnapshot.updated_at)}
                    </p>
                  )}
                </div>
              )}

              {/* Header form */}
              <section>
                <h2
                  className="text-sm font-semibold mb-4"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Fakturainformation
                </h2>
                <InvoiceForm data={formData} onChange={setFormData} />
              </section>

              {/* Line items */}
              <section>
                <h2
                  className="text-sm font-semibold mb-4"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Fakturarader
                  <span
                    className="ml-2 text-xs font-normal"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {lineItems.length} rad{lineItems.length !== 1 ? "er" : ""}
                  </span>
                </h2>
                {reviewCurrency !== "SEK" && (
                  <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                    Värdena i formuläret är i {reviewCurrency}. När du sparar lagras
                    jämförelsepriserna i SEK.
                  </p>
                )}
                <LineItemsEditor items={lineItems} onChange={setLineItems} />
              </section>

              {/* Bottom save buttons (convenience) */}
              <div className="flex flex-wrap gap-2 pb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Save className="w-3.5 h-3.5" />}
                  loading={saving}
                  onClick={() => handleSave()}
                >
                  Spara ändringar
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                  loading={saving}
                  onClick={() => handleSave({ approve: true })}
                >
                  Godkänn
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  loading={saving}
                  onClick={() => handleSave({ reject: true })}
                >
                  Avvisa
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price alerts below (full width) */}
      {!loading && alerts.length > 0 && (
        <div
          className="border-t px-6 py-4"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg-secondary)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Prisvarningar för denna faktura ({alerts.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {alerts.map((alert) => {
              const increase = alert.change_percent > 0;
              const productName =
                alert.products?.name ?? "Okänd produkt";
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm"
                  style={{
                    background: increase ? "var(--color-error-bg)" : "var(--color-success-bg)",
                    borderColor: increase ? "var(--color-error-border)" : "var(--color-success-border)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: increase ? "#fee2e2" : "#dcfce7" }}
                  >
                    {increase ? (
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: "#1a1a1a" }}>
                      {productName}
                    </p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>
                      {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)}{" "}
                      <span
                        className="font-semibold"
                        style={{ color: increase ? "#ef4444" : "#22c55e" }}
                      >
                        ({formatPercent(alert.change_percent)})
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
