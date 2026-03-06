"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  useToast,
} from "@/components/ui/index";
import {
  fetchDashboard,
  fetchDeviations,
  type Alert,
  type AgreementDeviation,
  type ProductOverview,
  type Supplier,
} from "@/lib/price-monitor-api";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { generateExcelReport } from "@/lib/excel-export";
import {
  generateAndDownloadPDF,
  type MonthlyReportData,
} from "@/components/price-monitor/monthly-report-pdf";

export default function ReportsPage() {
  const t = useTranslations("reports");
  const locale = useLocale() === "en" ? "en" : "sv";
  const { addToast } = useToast();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const previewItems = useMemo(
    () => [t("previewSpend"), t("previewAlerts"), t("previewDeviations"), t("previewProducts")],
    [t]
  );

  async function generatePdf() {
    setLoadingPdf(true);
    try {
      const response = await fetch(`/api/reports/monthly?month=${month}&locale=${locale}`);
      const body = await response.json();

      if (!response.ok || !body?.data) {
        throw new Error(body?.error || t("loadError"));
      }

      await generateAndDownloadPDF(body.data as MonthlyReportData, locale);
    } catch (error) {
      addToast({
        type: "error",
        title: t("generatePdf"),
        description: error instanceof Error ? error.message : t("loadError"),
      });
    } finally {
      setLoadingPdf(false);
    }
  }

  async function generateExcel() {
    setLoadingExcel(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Session missing.");
      }

      const [products, alerts, suppliers, deviations] = await Promise.all([
        fetchDashboard<ProductOverview[]>("products", {}, session),
        fetchDashboard<Alert[]>("alerts", {}, session),
        fetchDashboard<Supplier[]>("suppliers", {}, session),
        fetchDeviations({}, session),
      ]);

      generateExcelReport(
        {
          products,
          alerts,
          suppliers,
          deviations: deviations.map((deviation: AgreementDeviation) => ({
            ...deviation,
            product_name: deviation.products?.name || "",
            agreement_name: deviation.agreements?.name || "",
            deviation_type_label: deviation.deviation_type,
          })),
        },
        `${locale === "en" ? "purchase-report" : "inkopsrapport"}-${month}.xlsx`
      );
    } catch (error) {
      addToast({
        type: "error",
        title: t("downloadExcel"),
        description: error instanceof Error ? error.message : t("loadError"),
      });
    } finally {
      setLoadingExcel(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-xs">
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {t("period")}
            </label>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              icon={<FileText className="h-4 w-4" />}
              loading={loadingPdf}
              onClick={generatePdf}
            >
              {t("generatePdf")}
            </Button>
            <Button
              variant="primary"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              loading={loadingExcel}
              onClick={generateExcel}
            >
              {t("downloadExcel")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("previewTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {previewItems.map((item) => (
              <div
                key={item}
                className="rounded-xl border px-4 py-3 text-sm"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
