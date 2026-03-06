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

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatSEK(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1).replace(".", ",")}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// ─── API helpers ──────────────────────────────────────────────────────────────

type Session = { access_token: string };

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
