/**
 * Price Monitor API helper
 * Wraps the invoice-dashboard and process-invoice Supabase Edge Functions.
 */

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

function getHeaders(session: Session): Record<string, string> {
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    "Content-Type": "application/json",
  };
}

function dashboardUrl(action: string, params?: Record<string, string>): string {
  const url = new URL(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invoice-dashboard`
  );
  url.searchParams.set("action", action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

export async function fetchDashboard<T = unknown>(
  action: string,
  params?: Record<string, string>,
  session?: Session
): Promise<T> {
  const res = await fetch(dashboardUrl(action, params), {
    headers: getHeaders(session!),
  });
  if (!res.ok) throw new Error(`API-fel: ${res.status}`);
  return res.json();
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
  if (!res.ok) throw new Error(`API-fel: ${res.status}`);
  return res.json();
}

export async function saveSettings(
  settings: PriceMonitorSettings,
  session: Session
): Promise<unknown> {
  const res = await fetch(dashboardUrl("settings"), {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`API-fel: ${res.status}`);
  return res.json();
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
  if (!res.ok) throw new Error(`API-fel: ${res.status}`);
  return res.json();
}
