"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  FileSearch,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button, useToast } from "@/components/ui/index";
import { CurrencySelector } from "@/components/price-monitor/currency-selector";
import { ExtractionEditor } from "@/components/price-monitor/extraction-editor";
import { PdfPreview } from "@/components/price-monitor/pdf-preview";
import {
  defaultInvoiceFormData,
  numToSE,
  parseSENum,
  type InvoiceFormData,
} from "@/components/price-monitor/invoice-form";
import {
  emptyLineItem,
  type LineItemForm,
} from "@/components/price-monitor/line-items-editor";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  formatCurrencyValue,
  formatPercent,
  formatSEK,
  getPdfPreviewUrl,
  processInvoice,
  type ExtractedInvoiceData,
  type ExtractedInvoiceLineItem,
  type InvoiceDocumentRecord,
  type ProcessInvoiceResult,
} from "@/lib/price-monitor-api";

interface InvoiceUploadFlowProps {
  onClose: () => void;
  onProcessed: () => void;
}

interface ExistingDbLineItem {
  id: string;
  supplier_id: string | null;
  product_id: string | null;
  raw_description: string | null;
}

interface ExistingSupplierProduct {
  id: string;
  name: string | null;
}

type Step = 1 | 2 | 3 | 4;

function extractedToForm(ed: ExtractedInvoiceData | null): InvoiceFormData {
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

function rawToFormItem(item: ExtractedInvoiceLineItem): LineItemForm {
  return {
    description: item.description ?? "",
    quantity: item.quantity != null ? String(item.quantity).replace(".", ",") : "",
    unit: item.unit ?? "",
    unit_price: numToSE(item.unit_price_original ?? item.unit_price ?? null),
    amount: numToSE(item.amount_original ?? item.amount ?? null),
    vat_rate: item.vat_rate != null ? String(item.vat_rate).replace(".", ",") : "",
    matched_product: item.matched_product ?? null,
    match_confidence: item.match_confidence ?? 0,
    is_new_product: item.is_new_product ?? true,
    product_id: item.product_id ?? null,
  };
}

function convertToSEK(amount: number | null, rate: number): number | null {
  if (amount == null) return null;
  return Math.round(amount * rate * 100) / 100;
}

function isIncludedLineItem(item: LineItemForm): boolean {
  const amount = parseSENum(item.amount);
  return amount != null && Math.abs(amount) < 0.01;
}

function normalizeProductLabel(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function canonicalProductKey(value: string | null | undefined): string {
  const normalized = normalizeProductLabel(value).toLowerCase();
  if (!normalized) return "";

  return normalized
    .replace(/\s+-\s+[a-z0-9]{8,}$/i, "")
    .replace(/\s+[a-z0-9]{8,}$/i, "")
    .replace(/\s*\([^)]*\)$/i, "")
    .replace(/[_-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestProductMatchId(
  description: string | null | undefined,
  products: ExistingSupplierProduct[]
): string | null {
  const key = canonicalProductKey(description);
  if (!key) return null;

  const productWithKeys = products
    .map((product) => ({
      id: product.id,
      key: canonicalProductKey(product.name),
    }))
    .filter((product) => product.key.length > 0);

  const exact = productWithKeys.find((product) => product.key === key);
  if (exact) return exact.id;

  const prefix = productWithKeys.find(
    (product) =>
      key.startsWith(`${product.key} `) ||
      product.key.startsWith(`${key} `) ||
      key.includes(`${product.key} -`) ||
      product.key.includes(`${key} -`)
  );
  if (prefix) return prefix.id;

  return null;
}

function applyDbProductIdsToLineItems(
  items: LineItemForm[],
  dbItems: ExistingDbLineItem[]
) {
  return items.map((item, index) => {
    const dbProductId = dbItems[index]?.product_id ?? null;
    const productId = item.product_id ?? dbProductId;
    return {
      ...item,
      product_id: productId,
      is_new_product: productId ? false : item.is_new_product,
    };
  });
}

function collapseBundledLineItems(
  items: LineItemForm[],
  dbItems: ExistingDbLineItem[]
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

function buildLineItemsSummary(lineItems: LineItemForm[], rate: number) {
  return lineItems.map((item) => {
    const amount = parseSENum(item.amount) ?? 0;
    const amountSek = convertToSEK(amount, rate) ?? 0;

    return {
      description: item.description || "Rad utan namn",
      amount,
      amountSek,
      tracked: amount > 0,
      productId: item.product_id,
      isNewProduct: item.is_new_product,
    };
  });
}

export function InvoiceUploadFlow({
  onClose,
  onProcessed,
}: InvoiceUploadFlowProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingDbItems, setExistingDbItems] = useState<ExistingDbLineItem[]>([]);
  const [processResult, setProcessResult] = useState<ProcessInvoiceResult | null>(null);
  const [processedDoc, setProcessedDoc] = useState<InvoiceDocumentRecord | null>(null);

  const [formData, setFormData] = useState<InvoiceFormData>(defaultInvoiceFormData());
  const [lineItems, setLineItems] = useState<LineItemForm[]>([]);
  const [currency, setCurrency] = useState("SEK");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [rateSource, setRateSource] = useState<"auto" | "manual">("auto");
  const [rateFetchedAt, setRateFetchedAt] = useState<string | null>(null);
  const [autoProcess, setAutoProcess] = useState(true);

  const lineSummary = useMemo(
    () => buildLineItemsSummary(lineItems, exchangeRate),
    [exchangeRate, lineItems]
  );
  const trackedLineItemsCount = lineSummary.filter((item) => item.tracked).length;
  const newProductsCount = lineSummary.filter(
    (item) => item.tracked && item.isNewProduct
  ).length;

  const handleRateChange = useCallback((rate: number, source: "auto" | "manual") => {
    setExchangeRate(rate);
    setRateSource(source);
    setRateFetchedAt(new Date().toISOString());
  }, []);

  function resetFlow() {
    setStep(1);
    setFile(null);
    setErrorMsg("");
    setLoading(false);
    setDocumentId(null);
    setPreviewUrl(null);
    setExistingDbItems([]);
    setProcessResult(null);
    setProcessedDoc(null);
    setFormData(defaultInvoiceFormData());
    setLineItems([]);
    setCurrency("SEK");
    setExchangeRate(1);
    setRateSource("auto");
    setRateFetchedAt(null);
    setAutoProcess(true);
  }

  function handleFile(selectedFile: File) {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Endast PDF-filer stöds för tillfället.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMsg("Filen är för stor. Max 50 MB.");
      return;
    }

    setErrorMsg("");
    setFile(selectedFile);
  }

  async function getSessionOrThrow() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Kunde inte ansluta till Supabase.");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("Din session har gått ut.");

    return { supabase, session };
  }

  async function ensureDocumentProducts(
    documentIdToEnsure: string,
    accessToken: string
  ) {
    const response = await fetch(
      `/api/price-monitor/documents/${documentIdToEnsure}/ensure-products`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error || "Kunde inte säkerställa produkter för fakturan.");
    }
  }

  async function uploadDocument() {
    if (!file) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { supabase, session } = await getSessionOrThrow();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const storagePath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("raw_documents")
        .upload(storagePath, file);

      if (uploadError) {
        throw new Error(`Uppladdning misslyckades: ${uploadError.message}`);
      }

      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: session.user.id,
          filename: file.name,
          file_name: file.name,
          storage_path: storagePath,
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type || "application/pdf",
          status: "uploaded",
          document_domain: "invoice",
          doc_type: "invoice",
        })
        .select("id, user_id, storage_path, filename, status, sender_name, extracted_data")
        .single();

      if (docError || !doc) {
        throw new Error(`Databasfel: ${docError?.message ?? "kunde inte skapa dokument"}`);
      }

      setDocumentId(doc.id);
      setPreviewUrl(await getPdfPreviewUrl(storagePath, supabase));
      setProcessedDoc(doc as InvoiceDocumentRecord);
      setStep(2);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function runProcessing() {
    if (!documentId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { supabase, session } = await getSessionOrThrow();
      const result = await processInvoice(documentId, session);

      if (!result.success) {
        throw new Error("Bearbetningen misslyckades.");
      }

      await ensureDocumentProducts(documentId, session.access_token);

      const [{ data: docData, error: docError }, { data: dbItems, error: dbError }] =
        await Promise.all([
          supabase
            .from("documents")
            .select("id, user_id, storage_path, filename, status, sender_name, document_date, total_cost, extracted_data")
            .eq("id", documentId)
            .single(),
          supabase
            .from("invoice_line_items")
            .select("id, supplier_id, product_id, raw_description")
            .eq("document_id", documentId),
        ]);

      if (docError || !docData) throw new Error(docError?.message ?? "Kunde inte läsa dokumentet.");
      if (dbError) throw new Error(dbError.message);

      let nextDbItems = (dbItems as ExistingDbLineItem[]) ?? [];
      nextDbItems = await reconcileProductLinksByDescription(
        supabase,
        session.user.id,
        nextDbItems
      );

      const extractedData = (docData.extracted_data ?? null) as ExtractedInvoiceData | null;
      const nextFormData = extractedToForm(extractedData);
      const extractedLineItems =
        extractedData?.line_items?.length
          ? extractedData.line_items.map(rawToFormItem)
          : [emptyLineItem()];
      const matchedLineItems = applyDbProductIdsToLineItems(
        extractedLineItems,
        nextDbItems
      );
      const normalizedLineItems = collapseBundledLineItems(
        matchedLineItems,
        nextDbItems
      );
      const extractedCurrency = extractedData?.currency ?? currency;
      const extractedRate = extractedData?.exchange_rate_to_sek ?? exchangeRate;

      setProcessResult(result);
      setProcessedDoc(docData as InvoiceDocumentRecord);
      setExistingDbItems(nextDbItems);
      setFormData(nextFormData);
      setLineItems(normalizedLineItems.items);
      setCurrency(extractedCurrency);
      setExchangeRate(extractedRate || 1);
      setRateSource(
        extractedData?.exchange_rate_manual_override ? "manual" : "auto"
      );
      setRateFetchedAt(extractedData?.exchange_rate_updated_at ?? new Date().toISOString());

      if (autoProcess) {
        if (normalizedLineItems.changed) {
          await saveEditedData({
            document: docData as InvoiceDocumentRecord,
            result,
            items: normalizedLineItems.items,
            invoiceData: nextFormData,
            selectedCurrency: extractedCurrency,
            selectedRate: extractedRate || 1,
            dbItems: nextDbItems,
          });
        }
        setStep(4);
        onProcessed();
        return;
      }

      setStep(3);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEditedData(args?: {
    document?: InvoiceDocumentRecord;
    result?: ProcessInvoiceResult;
    items?: LineItemForm[];
    invoiceData?: InvoiceFormData;
    selectedCurrency?: string;
    selectedRate?: number;
    dbItems?: ExistingDbLineItem[];
  }) {
    const targetDoc = args?.document ?? processedDoc;
    const targetItems = args?.items ?? lineItems;
    const targetForm = args?.invoiceData ?? formData;
    const targetCurrency = args?.selectedCurrency ?? currency;
    const targetRate = args?.selectedRate ?? exchangeRate;
    const targetResult = args?.result ?? processResult;
    const targetDbItems = args?.dbItems ?? existingDbItems;
    const normalizedItems = collapseBundledLineItems(targetItems, targetDbItems).items;

    if (!targetDoc?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { supabase, session } = await getSessionOrThrow();
      const supplierId = targetDbItems[0]?.supplier_id ?? null;
      const totalAmountOriginal = parseSENum(targetForm.total_amount);
      const vatAmountOriginal = parseSENum(targetForm.vat_amount);

      const updatedExtractedData: ExtractedInvoiceData = {
        supplier: {
          name: targetForm.supplier_name,
          org_number: targetForm.supplier_org_number || null,
        },
        invoice_number: targetForm.invoice_number || null,
        invoice_date: targetForm.invoice_date || null,
        due_date: targetForm.due_date || null,
        total_amount: totalAmountOriginal,
        vat_amount: vatAmountOriginal,
        currency: targetCurrency,
        total_amount_original: totalAmountOriginal,
        vat_amount_original: vatAmountOriginal,
        total_amount_sek: convertToSEK(totalAmountOriginal, targetRate),
        vat_amount_sek: convertToSEK(vatAmountOriginal, targetRate),
        exchange_rate_to_sek: targetRate,
        exchange_rate_source: rateSource,
        exchange_rate_updated_at: rateFetchedAt ?? new Date().toISOString(),
        exchange_rate_manual_override: rateSource === "manual",
        invoice_classification:
          targetDoc.extracted_data?.invoice_classification ?? null,
        line_items: normalizedItems.map((item) => {
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
            unit_price_sek: convertToSEK(unitPriceOriginal, targetRate),
            amount_sek: convertToSEK(amountOriginal, targetRate),
            vat_rate: parseSENum(item.vat_rate),
            matched_product: item.matched_product,
            match_confidence: item.match_confidence,
            is_new_product: item.is_new_product,
            product_id: item.product_id,
          };
        }),
      };

      const { error: updateError } = await supabase
        .from("documents")
        .update({
          extracted_data: updatedExtractedData,
          sender_name: targetForm.supplier_name || null,
          document_date: targetForm.invoice_date || null,
          total_cost: convertToSEK(totalAmountOriginal, targetRate),
          status: "approved",
        })
        .eq("id", targetDoc.id);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("document_id", targetDoc.id);

      if (deleteError) throw deleteError;

      if (normalizedItems.length > 0) {
        const rows = normalizedItems.map((item, index) => {
          const sourceRow = targetDbItems[index];
          const unitPriceOriginal = parseSENum(item.unit_price);
          const amountOriginal = parseSENum(item.amount);

          return {
            user_id: session.user.id,
            document_id: targetDoc.id,
            supplier_id: sourceRow?.supplier_id ?? supplierId,
            product_id: item.product_id ?? sourceRow?.product_id ?? null,
            raw_description: item.description,
            quantity: parseSENum(item.quantity),
            unit: item.unit || null,
            unit_price: convertToSEK(unitPriceOriginal, targetRate),
            amount: convertToSEK(amountOriginal, targetRate),
            vat_rate: parseSENum(item.vat_rate),
            invoice_number: targetForm.invoice_number || null,
            invoice_date: targetForm.invoice_date || null,
            match_confidence: item.match_confidence,
            manually_verified: !autoProcess,
          };
        });

        const { error: insertError } = await supabase
          .from("invoice_line_items")
          .insert(rows);

        if (insertError) throw insertError;
      }

      setProcessedDoc((prev) =>
        prev
          ? {
              ...prev,
              extracted_data: updatedExtractedData,
              status: "approved",
              sender_name: targetForm.supplier_name || null,
            }
          : prev
      );
      setLineItems(normalizedItems);
      setProcessResult(targetResult ?? null);
      addToast({ type: "success", title: "Fakturan sparades" });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Kunde inte spara.");
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function reconcileProductLinksByDescription(
    supabase: Awaited<ReturnType<typeof getSessionOrThrow>>["supabase"],
    userId: string,
    dbItems: ExistingDbLineItem[]
  ): Promise<ExistingDbLineItem[]> {
    const supplierId = dbItems.find((item) => item.supplier_id)?.supplier_id;
    if (!supplierId || dbItems.length === 0) {
      return dbItems;
    }

    const { data: supplierProducts, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .eq("user_id", userId)
      .eq("supplier_id", supplierId);

    if (productsError || !Array.isArray(supplierProducts) || supplierProducts.length === 0) {
      return dbItems;
    }

    const updates = dbItems
      .map((item) => {
        const matchId = findBestProductMatchId(item.raw_description, supplierProducts);
        if (!matchId || matchId === item.product_id) return null;
        return { lineItemId: item.id, productId: matchId };
      })
      .filter((item): item is { lineItemId: string; productId: string } => item !== null);

    if (updates.length === 0) {
      return dbItems;
    }

    await Promise.all(
      updates.map((update) =>
        supabase
          .from("invoice_line_items")
          .update({ product_id: update.productId })
          .eq("id", update.lineItemId)
      )
    );

    const updateMap = new Map(updates.map((update) => [update.lineItemId, update.productId]));
    return dbItems.map((item) => ({
      ...item,
      product_id: updateMap.get(item.id) ?? item.product_id,
    }));
  }

  async function handleApproveAndSave() {
    try {
      await saveEditedData();
      setStep(4);
      onProcessed();
    } catch {
      // Error already handled in saveEditedData
    }
  }

  const currencySummary =
    currency === "SEK"
      ? null
      : `Originalbelopp visas i ${currency}. Vid sparning används ${exchangeRate
          .toFixed(3)
          .replace(".", ",")} som växelkurs till SEK.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Ladda upp faktura
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Steg {step} av 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="transition-opacity hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-140px)] overflow-y-auto p-6">
          {errorMsg && (
            <div
              className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
              style={{ background: "#fef2f2", color: "#ef4444" }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors"
                style={{
                  borderColor: dragging ? "var(--color-accent)" : "var(--color-border)",
                  background: dragging
                    ? "var(--color-accent-muted)"
                    : "var(--color-bg-secondary)",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile) handleFile(droppedFile);
                }}
              >
                <Upload className="h-10 w-10" style={{ color: "var(--color-accent)" }} />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Dra och släpp en PDF här
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    eller klicka för att välja fil
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFile(selectedFile);
                  }}
                />
              </div>

              {file && (
                <div
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <FileText className="h-5 w-5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                  <span className="flex-1 truncate text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {file.name}
                  </span>
                  <button type="button" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
              <PdfPreview url={previewUrl} />
              <div className="space-y-4">
                <CurrencySelector
                  currency={currency}
                  rate={exchangeRate}
                  rateSource={rateSource}
                  fetchedAt={rateFetchedAt}
                  onCurrencyChange={setCurrency}
                  onRateChange={handleRateChange}
                  disabled={loading}
                />

                <div
                  className="space-y-3 rounded-xl border p-4"
                  style={{
                    background: "var(--color-bg-elevated)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        Lita på AI
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Automatisk bearbetning hoppar över granskningen och sparar direkt.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoProcess((prev) => !prev)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        autoProcess ? "bg-[var(--color-accent)]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          autoProcess ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <ExtractionEditor
              formData={{ ...formData, currency }}
              lineItems={lineItems}
              classification={processedDoc?.extracted_data?.invoice_classification}
              currencySummary={currencySummary}
              onFormChange={(next) => {
                setFormData(next);
                setCurrency(next.currency);
              }}
              onLineItemsChange={setLineItems}
            />
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6" style={{ color: "var(--color-success)" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Fakturan sparades
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {formData.supplier_name || processResult?.supplier || "Okänd leverantör"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryStat label="Spårade rader" value={String(trackedLineItemsCount)} />
                <SummaryStat label="Nya produkter" value={String(newProductsCount)} />
                <SummaryStat
                  label="Prisvarningar"
                  value={String(processResult?.alerts_count ?? 0)}
                />
              </div>

              <div
                className="rounded-xl border p-4"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border)",
                }}
              >
                <p className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Faktura från {formData.supplier_name || processResult?.supplier || "Okänd leverantör"}
                </p>
                <div className="space-y-2">
                  {lineSummary.map((item) => (
                    <div
                      key={`${item.description}-${item.productId ?? "new"}`}
                      className={`flex items-start justify-between gap-3 ${
                        item.tracked ? "text-sm" : "text-xs"
                      }`}
                      style={{
                        color: item.tracked
                          ? "var(--color-text-primary)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      <span>
                        {item.description}
                        {!item.tracked ? " ← Inkluderat" : " ← Spårad"}
                      </span>
                      <span className="text-right">
                        {formatCurrencyValue(item.amount, currency)}
                        {currency !== "SEK" ? ` (${formatSEK(item.amountSek)})` : ""}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-4 border-t pt-3 text-sm font-semibold"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Total:{" "}
                  {formatCurrencyValue(parseSENum(formData.total_amount) ?? 0, currency)}
                  {currency !== "SEK" ? (
                    <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                      ({formatSEK(convertToSEK(parseSENum(formData.total_amount), exchangeRate) ?? 0)} @{" "}
                      {exchangeRate.toFixed(3).replace(".", ",")})
                    </span>
                  ) : null}
                </div>
              </div>

              {processResult?.alerts?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Prisvarningar
                  </p>
                  {processResult.alerts.map((alert, index) => (
                    <div
                      key={`${alert.product_id}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm"
                      style={{
                        background: "#fef2f2",
                        borderColor: "#fecaca",
                      }}
                    >
                      <div>
                        <p style={{ color: "#991b1b" }}>
                          {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)} (
                          {formatPercent(alert.change_percent)})
                        </p>
                      </div>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => router.push(`/price-monitor/products/${alert.product_id}`)}
                      >
                        Öppna produkt
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-accent)" }} />
            </div>
          )}
        </div>

        <div
          className="flex flex-wrap justify-end gap-3 border-t px-6 py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          {step === 1 && (
            <>
              <Button variant="secondary" onClick={onClose}>
                Avbryt
              </Button>
              <Button
                variant="primary"
                disabled={!file}
                icon={<Upload className="h-4 w-4" />}
                onClick={uploadDocument}
              >
                Ladda upp
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="secondary" onClick={onClose}>
                Avbryt
              </Button>
              <Button variant="primary" onClick={runProcessing}>
                Bearbeta
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="secondary" onClick={runProcessing}>
                Bearbeta igen
              </Button>
              <Button variant="primary" onClick={handleApproveAndSave}>
                Godkänn & Spara
              </Button>
            </>
          )}

          {step === 4 && (
            <>
              {documentId && (
                <Button
                  variant="secondary"
                  icon={<FileSearch className="h-4 w-4" />}
                  onClick={() => {
                    onClose();
                    router.push(`/price-monitor/review/${documentId}`);
                  }}
                >
                  Öppna faktura
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={resetFlow}
              >
                Ladda upp fler
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  router.push("/price-monitor");
                }}
              >
                Gå till översikt
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
      }}
    >
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
