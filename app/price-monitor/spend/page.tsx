"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, TrendingUp, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui/index";
import { AiInsights } from "@/components/price-monitor/ai-insights";
import { SpendBarChart } from "@/components/price-monitor/spend-bar-chart";
import { SpendDonutChart } from "@/components/price-monitor/spend-donut-chart";
import { SpendTrendChart } from "@/components/price-monitor/spend-trend-chart";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchAiInsights,
  fetchSpendOverview,
  formatSEK,
  type AiInsight,
  type SpendOverview,
} from "@/lib/price-monitor-api";

export default function SpendOverviewPage() {
  const t = useTranslations("spend");
  const [overview, setOverview] = useState<SpendOverview | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/auth/login";
        return;
      }

      try {
        const [overviewData, insightData] = await Promise.all([
          fetchSpendOverview(session),
          fetchAiInsights(session).catch(() => []),
        ]);
        setOverview(overviewData);
        setInsights(insightData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("description"));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const supplierRows = Array.isArray(overview?.by_supplier) ? overview.by_supplier : [];
  const categoryRows = Array.isArray(overview?.by_category) ? overview.by_category : [];
  const hasData =
    (overview?.total_spend ?? 0) > 0 ||
    supplierRows.length > 0 ||
    categoryRows.length > 0;

  const stats = [
    {
      label: t("totalSpend"),
      value: overview?.total_spend ?? 0,
      icon: Wallet,
      color: "#3B82F6",
    },
    {
      label: t("last30d"),
      value: overview?.spend_last_30d ?? 0,
      icon: TrendingUp,
      color: "#10B981",
    },
    {
      label: t("last12m"),
      value: overview?.spend_last_12m ?? 0,
      icon: BarChart3,
      color: "#8B5CF6",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error-text)" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${stat.color}18` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: stat.color }} />
                    </div>
                    <div>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {formatSEK(stat.value)}
                      </p>
                      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {stat.label}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-[430px] rounded-xl" />
          <Skeleton className="h-[430px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl xl:col-span-2" />
        </div>
      ) : !hasData ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="w-6 h-6" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        </Card>
      ) : (
        <>
          <AiInsights insights={insights} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("byCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendDonutChart categories={overview?.by_category ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("bySupplier")}</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendBarChart suppliers={overview?.by_supplier ?? []} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("monthlyTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SpendTrendChart monthly={overview?.monthly ?? []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
