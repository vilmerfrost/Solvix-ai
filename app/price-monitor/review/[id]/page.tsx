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
import { formatSEK, formatPercent, formatDate } from "@/lib/price-monitor-api";

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
    total_amount: numToSE(ed.total_amount ?? null),
    vat_amount: numToSE(ed.vat_amount ?? null),
    currency: ed.currency ?? "SEK",
  };
}

function rawToFormItem(item: RawLineItem): LineItemForm {
  return {
    description: item.description ?? "",
    quantity: item.quantity != null ? String(item.quantity).replace(".", ",") : "",
    unit: item.unit ?? "",
    unit_price: numToSE(item.unit_price ?? null),
    amount: numToSE(item.amount ?? null),
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"pdf" | "form">("form");

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
      const [{ data: docData }, { data: dbItems }, { data: alertsData }] =
        await Promise.all([
          supabase.from("documents").select("*").eq("id", id).single(),
          supabase.from("invoice_line_items").select("*").eq("document_id", id),
          supabase
            .from("price_alerts")
            .select("*, products(name, unit)")
            .eq("new_document_id", id)
            .order("created_at", { ascending: false }),
        ]);

      if (docData) {
        setDoc(docData as InvoiceDocument);

        // Populate form from extracted_data, falling back to DB line items
        const ed = docData.extracted_data as ExtractedData | null;
        setFormData(extractedToForm(ed));

        if (ed?.line_items?.length) {
          setLineItems(ed.line_items.map(rawToFormItem));
        } else if (dbItems?.length) {
          setLineItems((dbItems as DbLineItem[]).map(dbItemToFormItem));
        }

        // PDF signed URL
        if (docData.storage_path) {
          const { data: urlData } = await supabase.storage
            .from("documents")
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
      // Build updated extracted_data
      const updatedExtracted: ExtractedData = {
        supplier: {
          name: formData.supplier_name,
          org_number: formData.supplier_org_number || null,
        },
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date || null,
        due_date: formData.due_date || null,
        total_amount: parseSENum(formData.total_amount),
        vat_amount: parseSENum(formData.vat_amount),
        currency: formData.currency,
        line_items: lineItems.map((item) => ({
          description: item.description,
          quantity: parseSENum(item.quantity),
          unit: item.unit || null,
          unit_price: parseSENum(item.unit_price),
          amount: parseSENum(item.amount),
          vat_rate: parseSENum(item.vat_rate),
          matched_product: item.matched_product,
          match_confidence: item.match_confidence,
          is_new_product: item.is_new_product,
          product_id: item.product_id,
        })),
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
        total_cost: parseSENum(formData.total_amount),
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

      if (lineItems.length > 0) {
        const insertRows = lineItems.map((item) => ({
          user_id: userId,
          document_id: id,
          supplier_id: supplierId,
          product_id: item.product_id,
          raw_description: item.description,
          quantity: parseSENum(item.quantity),
          unit: item.unit || null,
          unit_price: parseSENum(item.unit_price),
          amount: parseSENum(item.amount),
          vat_rate: parseSENum(item.vat_rate),
          invoice_number: formData.invoice_number || null,
          invoice_date: formData.invoice_date || null,
          match_confidence: item.match_confidence,
          manually_verified: true,
        }));

        const { error: insErr } = await supabase
          .from("invoice_line_items")
          .insert(insertRows);
        if (insErr) throw insErr;
      }

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
                    background: increase ? "#fef2f2" : "#f0fdf4",
                    borderColor: increase ? "#fca5a5" : "#86efac",
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
