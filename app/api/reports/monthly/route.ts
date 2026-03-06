import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export const maxDuration = 60;

function getMonthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

function formatPeriod(month: string, locale: "sv" | "en") {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function startOfMonthsAgo(months: number) {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString();
}

export async function GET(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const locale = searchParams.get("locale") === "en" ? "en" : "sv";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ success: false, error: "Invalid month format." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { start, end } = getMonthRange(month);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  try {
    const [
      documentsResult,
      alertsResult,
      deviationsResult,
      productLinesResult,
      companyResult,
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("id, sender_name, document_date, total_cost")
        .eq("user_id", user.id)
        .gte("document_date", startIso)
        .lt("document_date", endIso),
      supabase
        .from("price_alerts")
        .select("product_name, supplier_name, previous_price, new_price, change_percent, new_invoice_date")
        .eq("user_id", user.id)
        .gte("new_invoice_date", startIso)
        .lt("new_invoice_date", endIso)
        .order("change_percent", { ascending: false }),
      supabase
        .from("agreement_deviations")
        .select("deviation_type, actual_price, agreed_price, potential_savings, products(name)")
        .eq("user_id", user.id)
        .gte("invoice_date", startIso)
        .lt("invoice_date", endIso)
        .order("potential_savings", { ascending: false }),
      supabase
        .from("invoice_line_items")
        .select("product_id, quantity, unit_price, invoice_date, products(name), suppliers(name)")
        .eq("user_id", user.id)
        .gte("invoice_date", startIso)
        .lt("invoice_date", endIso),
      supabase
        .from("settings")
        .select("company_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const [spend30Result, spend12Result] = await Promise.all([
      supabase
        .from("documents")
        .select("total_cost")
        .eq("user_id", user.id)
        .gte("document_date", startOfMonthsAgo(1)),
      supabase
        .from("documents")
        .select("total_cost")
        .eq("user_id", user.id)
        .gte("document_date", startOfMonthsAgo(12)),
    ]);

    if (documentsResult.error) throw documentsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (deviationsResult.error) throw deviationsResult.error;
    if (productLinesResult.error) throw productLinesResult.error;
    if (spend30Result.error) throw spend30Result.error;
    if (spend12Result.error) throw spend12Result.error;

    const documents = documentsResult.data ?? [];
    const alerts = alertsResult.data ?? [];
    const deviations = deviationsResult.data ?? [];
    const productLines = productLinesResult.data ?? [];

    const supplierMap = new Map<string, { name: string; spend: number; invoiceCount: number }>();
    for (const doc of documents) {
      const key = doc.sender_name || "Unknown supplier";
      const current = supplierMap.get(key) ?? { name: key, spend: 0, invoiceCount: 0 };
      current.spend += Number(doc.total_cost ?? 0);
      current.invoiceCount += 1;
      supplierMap.set(key, current);
    }

    const productMap = new Map<string, { name: string; supplier: string; price: number; invoices: number }>();
    for (const line of productLines) {
      const name = line.products?.name || "Unknown product";
      const supplier = line.suppliers?.name || "Unknown supplier";
      const key = `${name}:${supplier}`;
      const current = productMap.get(key) ?? { name, supplier, price: 0, invoices: 0 };
      current.price = Number(line.unit_price ?? 0);
      current.invoices += 1;
      productMap.set(key, current);
    }

    const totalSpend = documents.reduce((sum, doc) => sum + Number(doc.total_cost ?? 0), 0);
    const spend30d = (spend30Result.data ?? []).reduce((sum, doc) => sum + Number(doc.total_cost ?? 0), 0);
    const spend12m = (spend12Result.data ?? []).reduce((sum, doc) => sum + Number(doc.total_cost ?? 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        companyName: companyResult.data?.company_name || user.email || "Solvix customer",
        period: formatPeriod(month, locale),
        generatedAt: new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date()),
        totalSpend,
        spend30d,
        spend12m,
        topSuppliers: Array.from(supplierMap.values())
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 10),
        priceAlerts: alerts.map((alert) => ({
          product: alert.product_name || "Unknown product",
          supplier: alert.supplier_name || "Unknown supplier",
          oldPrice: Number(alert.previous_price ?? 0),
          newPrice: Number(alert.new_price ?? 0),
          change: Number(alert.change_percent ?? 0),
        })),
        deviations: deviations.map((deviation) => ({
          type: String(deviation.deviation_type ?? ""),
          product: deviation.products?.name || "Unknown product",
          actual: Number(deviation.actual_price ?? 0),
          agreed: Number(deviation.agreed_price ?? 0),
          savings: Number(deviation.potential_savings ?? 0),
        })),
        topProducts: Array.from(productMap.values())
          .sort((a, b) => b.invoices - a.invoices)
          .slice(0, 10),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate report.",
      },
      { status: 500 }
    );
  }
}
