"use client";

import { useEffect, useState } from "react";
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
import { SpendBarChart } from "@/components/price-monitor/spend-bar-chart";
import { SpendDonutChart } from "@/components/price-monitor/spend-donut-chart";
import { SpendTrendChart } from "@/components/price-monitor/spend-trend-chart";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchSpendOverview,
  formatSEK,
  type SpendOverview,
} from "@/lib/price-monitor-api";

export default function SpendOverviewPage() {
  const [overview, setOverview] = useState<SpendOverview | null>(null);
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
        setOverview(await fetchSpendOverview(session));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunde inte hämta inköpsanalys.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const hasData =
    (overview?.total_spend ?? 0) > 0 ||
    (overview?.by_supplier.length ?? 0) > 0 ||
    (overview?.by_category.length ?? 0) > 0;

  const stats = [
    {
      label: "Totala utgifter",
      value: overview?.total_spend ?? 0,
      icon: Wallet,
      color: "#3B82F6",
    },
    {
      label: "Senaste 30 dagarna",
      value: overview?.spend_last_30d ?? 0,
      icon: TrendingUp,
      color: "#10B981",
    },
    {
      label: "Senaste 12 månaderna",
      value: overview?.spend_last_12m ?? 0,
      icon: BarChart3,
      color: "#8B5CF6",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Utgiftsöversikt"
        description="Se var pengarna går, vilka leverantörer som kostar mest och hur inköpen utvecklas över tid."
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
            title="Ingen data ännu"
            description="Ladda upp fakturor för att se din inköpsanalys"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendDonutChart categories={overview?.by_category ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per leverantör</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendBarChart suppliers={overview?.by_supplier ?? []} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Månadstrend</CardTitle>
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
