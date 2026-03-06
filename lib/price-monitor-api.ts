/**
 * Price Monitor API helper
 * Wraps the invoice-dashboard and process-invoice Supabase Edge Functions.
 */

import {
  getDefaultExchangeRates,
  normalizeExchangeRates,
  normalizeManualExchangeRates,
  type PriceMonitorExchangeRates,
  type PriceMonitorManualExchangeRates,
} from "@/lib/price-monitor-currency";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  product_unit: string | null;
  supplier_id: string;
  supplier_name: string;
  previous_price: number;
  new_price: number;
  change_percent: number;
  previous_invoice_date: string;
  new_invoice_date: string;
  status: "new" | "reviewed" | "dismissed" | "actioned";
  notes: string | null;
  created_at: string;
  previous_document_id?: string | null;
  /** Optional — present when the backend includes the source document id */
  new_document_id?: string | null;
}

export interface ProductOverview {
  user_id: string;
  product_id: string;
  product_name: string;
  unit: string | null;
  supplier_name: string;
  supplier_id: string;
  latest_price: number;
  latest_date: string;
  previous_price: number | null;
  previous_date: string | null;
  change_percent: number | null;
  invoice_count: number;
}

export interface PriceHistory {
  user_id: string;
  product_id: string;
  product_name: string;
  product_unit: string | null;
  supplier_name: string;
  supplier_id: string;
  invoice_date: string;
  unit_price: number;
  quantity: number;
  amount: number;
  invoice_number: string | null;
  document_id: string;
  match_confidence: number;
}

export interface Supplier {
  user_id: string;
  supplier_id: string;
  supplier_name: string;
  org_number: string | null;
  invoice_count: number;
  product_count: number;
  first_invoice: string;
  last_invoice: string;
  open_alerts: number;
}

export interface DashboardOverview {
  product_count: number;
  supplier_count: number;
  open_alerts: number;
  open_deviations: number;
  recent_alerts: Alert[];
}

export interface PriceMonitorSettings {
  alert_threshold_percent: number;
  auto_alert: boolean;
  notify_email: string | null;
  exchange_rates: PriceMonitorExchangeRates;
  manual_exchange_rates: PriceMonitorManualExchangeRates;
  exchange_rates_source: string | null;
  exchange_rates_updated_at: string | null;
}

export interface ProcessInvoiceResult {
  success: boolean;
  document_id: string;
  supplier: string;
  line_items_count: number;
  alerts_count: number;
  alerts: Array<{
    product_id: string;
    previous_price: number;
    new_price: number;
    change_percent: number;
  }>;
}

export interface ExtractedInvoiceLineItem {
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

export interface ExtractedInvoiceData {
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
  invoice_classification?: string | null;
  line_items?: ExtractedInvoiceLineItem[];
}

export interface InvoiceDocumentRecord {
  id: string;
  user_id: string;
  storage_path: string | null;
  filename: string | null;
  status: string;
  sender_name: string | null;
  document_date?: string | null;
  total_cost?: number | null;
  extracted_data: ExtractedInvoiceData | null;
}

export interface AiGroupSuggestion {
  group_name: string;
  products: string[];
  confidence: number;
}

export interface AiInsight {
  title: string;
  insight: string;
  impact: "high" | "medium" | "low";
  action: string;
  estimated_savings_sek: number | null;
}

export interface SpendBySupplier {
  user_id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_count: number;
  product_count: number;
  total_spend: number;
  first_invoice: string;
  last_invoice: string;
  spend_last_30d: number;
  spend_last_90d: number;
  spend_last_12m: number;
}

export interface SpendByCategory {
  user_id: string;
  category_id: string | null;
  category_name: string;
  color: string | null;
  product_count: number;
  supplier_count: number;
  total_spend: number;
  spend_last_12m: number;
  spend_last_30d: number;
}

export interface SpendMonthly {
  user_id: string;
  month: string;
  supplier_id: string;
  supplier_name: string;
  total_spend: number;
  invoice_count: number;
  product_count: number;
}

export interface SpendOverview {
  total_spend: number;
  spend_last_30d: number;
  spend_last_12m: number;
  by_supplier: SpendBySupplier[];
  by_category: SpendByCategory[];
  monthly: SpendMonthly[];
}

export interface SupplierComparisonRow {
  user_id: string;
  product_id: string;
  product_name: string;
  unit: string | null;
  group_id: string;
  group_name: string;
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  invoice_date: string;
  cheapest_price: number;
  most_expensive_price: number;
  suppliers_count: number;
  premium_percent: number;
}

export interface ProductGroup {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  spend_categories: { name: string; color: string | null } | null;
  products: Array<{
    id: string;
    name: string;
    unit: string | null;
    supplier_id: string;
    suppliers: { name: string };
  }>;
}

export interface SpendCategory {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
}

export interface AgreementItem {
  id: string;
  product_group_id: string | null;
  category_id: string | null;
  description: string | null;
  agreed_price: number | null;
  discount_percent: number | null;
  max_price: number | null;
  unit: string | null;
  product_groups: { name: string } | null;
  spend_categories: { name: string } | null;
}

export interface Agreement {
  id: string;
  user_id: string;
  supplier_id: string;
  suppliers: { name: string };
  name: string;
  agreement_number: string | null;
  start_date: string;
  end_date: string | null;
  status: "active" | "expired" | "terminated";
  discount_percent: number | null;
  terms_description: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  agreement_items: AgreementItem[];
}

export interface AgreementDeviation {
  id: string;
  user_id: string;
  agreement_id: string;
  agreements: {
    name: string;
    supplier_id: string;
    suppliers: { name: string };
  };
  products: { name: string; unit: string | null } | null;
  product_id: string | null;
  supplier_id: string;
  deviation_type:
    | "wrong_supplier"
    | "price_above_agreed"
    | "no_discount_applied"
    | "expired_agreement";
  actual_price: number | null;
  agreed_price: number | null;
  potential_savings: number | null;
  invoice_date: string | null;
  description: string;
  status: "new" | "reviewed" | "dismissed" | "actioned";
  notes: string | null;
  created_at: string;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function getCurrentLocale(): "sv-SE" | "en-GB" {
  if (typeof document === "undefined") return "sv-SE";

  const match = document.cookie.match(/(?:^|;\s*)locale=(sv|en)(?:;|$)/);
  return match?.[1] === "en" ? "en-GB" : "sv-SE";
}

export function formatSEK(value: number): string {
  return new Intl.NumberFormat(getCurrentLocale(), {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyValue(
  value: number,
  currency: string
): string {
  return new Intl.NumberFormat(getCurrentLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  const locale = getCurrentLocale();
  return `${prefix}${value.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// ─── API helpers ──────────────────────────────────────────────────────────────

type Session = { access_token: string };

/** Ensures value is an array. Handles wrapped responses like { products: [] } or { data: [] }. */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const arr =
      obj.products ??
      obj.suppliers ??
      obj.suggestions ??
      obj.groups ??
      obj.data ??
      obj.items;
    if (Array.isArray(arr)) return arr as T[];
  }
  return [];
}

const DASHBOARD_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invoice-dashboard`;

function getHeaders(session: Session): Record<string, string> {
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function getApiError(res: Response): Promise<string> {
  let message = `API-fel: ${res.status}`;

  try {
    const body = await res.json();
    if (typeof body?.error === "string" && body.error) {
      message = body.error;
    }
    if (typeof body?.details === "string" && body.details) {
      message = `${message}: ${body.details}`;
    }
  } catch {
    // Fall back to the HTTP status when the response is not JSON.
  }

  return message;
}

function normalizeSettings(
  settings?: Partial<PriceMonitorSettings> | null
): PriceMonitorSettings {
  return {
    alert_threshold_percent: settings?.alert_threshold_percent ?? 5,
    auto_alert: settings?.auto_alert ?? true,
    notify_email: settings?.notify_email ?? null,
    exchange_rates: normalizeExchangeRates(settings?.exchange_rates),
    manual_exchange_rates: normalizeManualExchangeRates(
      settings?.manual_exchange_rates
    ),
    exchange_rates_source: settings?.exchange_rates_source ?? null,
    exchange_rates_updated_at: settings?.exchange_rates_updated_at ?? null,
  };
}

function dashboardUrl(action: string, params?: Record<string, string>): string {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("action", action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

async function postDashboard<T>(
  action: string,
  body: unknown,
  session: Session
): Promise<T> {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("action", action);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}

export async function fetchDashboard<T = unknown>(
  action: string,
  params?: Record<string, string>,
  session?: Session
): Promise<T> {
  const res = await fetch(dashboardUrl(action, params), {
    headers: getHeaders(session!),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  const data = await res.json();

  if (action === "settings") {
    return normalizeSettings(data) as T;
  }

  return data;
}

export async function updateAlert(
  alertId: string,
  status: "reviewed" | "dismissed" | "actioned",
  notes: string | null,
  session: Session
): Promise<unknown> {
  const res = await fetch(dashboardUrl("update_alert"), {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify({ alert_id: alertId, status, notes }),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}

export async function saveSettings(
  settings: PriceMonitorSettings,
  session: Session
): Promise<PriceMonitorSettings> {
  const res = await fetch(dashboardUrl("settings"), {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  const data = await res.json();
  return normalizeSettings(data);
}

export function getDefaultPriceMonitorSettings(): PriceMonitorSettings {
  return {
    alert_threshold_percent: 5,
    auto_alert: true,
    notify_email: null,
    exchange_rates: getDefaultExchangeRates(),
    manual_exchange_rates: {},
    exchange_rates_source: null,
    exchange_rates_updated_at: null,
  };
}

export async function processInvoice(
  documentId: string,
  session: Session
): Promise<ProcessInvoiceResult> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-invoice`,
    {
      method: "POST",
      headers: getHeaders(session),
      body: JSON.stringify({ document_id: documentId }),
    }
  );
  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}

export async function getExchangeRate(
  from: string
): Promise<{ rate: number; fetched_at: string }> {
  if (from.toUpperCase() === "SEK") {
    return { rate: 1, fetched_at: new Date().toISOString() };
  }

  const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
  if (!res.ok) throw new Error("Kunde inte hämta växelkurs.");
  const data = await res.json();

  return {
    rate: data.rates?.SEK || 1,
    fetched_at: new Date().toISOString(),
  };
}

export async function getPdfPreviewUrl(
  storagePath: string,
  supabase: {
    storage: {
      from: (bucket: string) => {
        createSignedUrl: (
          path: string,
          expiresIn: number
        ) => Promise<{
          data: { signedUrl: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  }
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("raw_documents")
    .createSignedUrl(storagePath, 3600);

  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function fetchGroupSuggestions(
  session: Session
): Promise<AiGroupSuggestion[]> {
  return fetchDashboard("suggest_groups", {}, session);
}

export async function fetchAiInsights(
  session: Session
): Promise<AiInsight[]> {
  return fetchDashboard("ai_insights", {}, session);
}

export async function fetchSpendOverview(
  session: Session
): Promise<SpendOverview> {
  return fetchDashboard("spend_overview", {}, session);
}

export async function fetchSpendBySupplier(
  session: Session
): Promise<SpendBySupplier[]> {
  return fetchDashboard("spend_by_supplier", {}, session);
}

export async function fetchSpendMonthly(
  supplierId: string | null,
  session: Session
): Promise<SpendMonthly[]> {
  const params: Record<string, string> = {};
  if (supplierId) params.supplier_id = supplierId;
  return fetchDashboard("spend_monthly", params, session);
}

export async function fetchComparison(
  groupId: string | null,
  session: Session
): Promise<SupplierComparisonRow[]> {
  const params: Record<string, string> = {};
  if (groupId) params.group_id = groupId;
  return fetchDashboard("compare_suppliers", params, session);
}

export async function fetchProductGroups(
  session: Session
): Promise<ProductGroup[]> {
  return fetchDashboard("product_groups", {}, session);
}

export async function createProductGroup(
  name: string,
  categoryId: string | null,
  productIds: string[],
  session: Session
): Promise<{ id: string; name: string; product_ids: string[] }> {
  return postDashboard(
    "product_groups",
    { name, category_id: categoryId, product_ids: productIds },
    session
  );
}

export async function fetchCategories(
  session: Session
): Promise<SpendCategory[]> {
  return fetchDashboard("categories", {}, session);
}

export async function createCategory(
  name: string,
  color: string | null,
  session: Session
): Promise<SpendCategory> {
  return postDashboard("categories", { name, color }, session);
}

export async function fetchAgreements(
  params: { supplier_id?: string; status?: string },
  session: Session
): Promise<Agreement[]> {
  return fetchDashboard("agreements", params as Record<string, string>, session);
}

export async function createAgreement(
  data: unknown,
  session: Session
): Promise<Agreement> {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("action", "agreements");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}

export async function updateAgreement(
  data: unknown,
  session: Session
): Promise<Agreement> {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("action", "agreements");
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: getHeaders(session),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}

export async function addAgreementItem(
  data: unknown,
  session: Session
): Promise<AgreementItem> {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("action", "agreement_items");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}

export async function removeAgreementItem(
  id: string,
  session: Session
): Promise<{ success?: boolean }> {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("action", "agreement_items");
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: getHeaders(session),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}

export async function fetchDeviations(
  params: { status?: string; agreement_id?: string },
  session: Session
): Promise<AgreementDeviation[]> {
  return fetchDashboard("deviations", params as Record<string, string>, session);
}

export async function updateDeviation(
  deviationId: string,
  status: "reviewed" | "dismissed" | "actioned",
  notes: string | null,
  session: Session
): Promise<AgreementDeviation> {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("action", "update_deviation");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify({ deviation_id: deviationId, status, notes }),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  return res.json();
}
