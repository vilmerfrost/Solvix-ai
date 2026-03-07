"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Package,
  Truck,
  AlertTriangle,
  FileText,
  Upload,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { Button, Skeleton } from "@/components/ui/index";
import { AlertBanner } from "@/components/price-monitor/alert-banner";
import { InvoiceUploadModal } from "@/components/price-monitor/invoice-upload-modal";
import { SavingsBanner } from "@/components/price-monitor/savings-banner";
import { OnboardingCard } from "@/components/price-monitor/onboarding-card";
import { ActivityFeed, ActivityItem } from "@/components/price-monitor/activity-feed";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  fetchDeviations,
  AgreementDeviation,
  DashboardOverview,
  Alert,
  formatSEK,
  formatDate,
  formatPercent,
} from "@/lib/price-monitor-api";

export default function PriceMonitorDashboard() {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(null);
  const [recentDeviations, setRecentDeviations] = useState<AgreementDeviation[]>([]);
  const [savings, setSavings] = useState<{ total_savings: number, price_alert_savings: number, deviation_savings: number, comparison_savings: number } | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s as { access_token: string; user: { id: string } });

    try {
      const [overviewData, deviationData] = await Promise.all([
        fetchDashboard<DashboardOverview>("overview", undefined, s),
        fetchDeviations({ status: "new" }, s).catch(() => []),
      ]);
      setOverview(overviewData);
      setRecentDeviations(deviationData);

      // Fetch savings fallback
      const { data: savingsData } = await supabase
        .from('v_savings_summary')
        .select('*')
        .eq('user_id', s.user.id)
        .single();
      
      if (savingsData) {
        setSavings(savingsData);
      } else {
        setSavings({ total_savings: 0, price_alert_savings: 0, deviation_savings: 0, comparison_savings: 0 });
      }

      // Fetch activities
      const [recentDocs, recentAlerts, recentDevs] = await Promise.all([
        supabase.from('documents')
          .select('id, sender_name, status, processed_at, created_at')
          .eq('user_id', s.user.id)
          .eq('document_domain', 'invoice')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('price_alerts')
          .select('id, product_id, change_percent, created_at, products(name)')
          .eq('user_id', s.user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('agreement_deviations')
          .select('id, deviation_type, description, created_at')
          .eq('user_id', s.user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const feed: ActivityItem[] = [
        ...(recentDocs.data || []).map((d: any) => ({
          type: 'invoice' as const,
          text: `Faktura från ${d.sender_name || 'Okänd'} bearbetad`,
          date: d.processed_at || d.created_at,
        })),
        ...(recentAlerts.data || []).map((a: any) => ({
          type: 'alert' as const,
          text: `Prisökning upptäckt: ${a.products?.name} ${a.change_percent > 0 ? '+' : ''}${a.change_percent}%`,
          date: a.created_at,
        })),
        ...(recentDevs.data || []).map((d: any) => ({
          type: 'deviation' as const,
          text: d.description,
          date: d.created_at,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
      
      setActivities(feed);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => { load(); }, [load]);

  const stats = [
    {
      label: t("trackedProducts"),
      value: overview?.product_count ?? 0,
      icon: Package,
      alert: false,
    },
    {
      label: t("suppliers"),
      value: overview?.supplier_count ?? 0,
      icon: Truck,
      alert: false,
    },
    {
      label: t("openAlerts"),
      value: overview?.open_alerts ?? 0,
      icon: AlertTriangle,
      alert: (overview?.open_alerts ?? 0) > 0,
    },
    {
      label: t("agreementDeviations"),
      value: overview?.open_deviations ?? 0,
      icon: FileText,
      alert: (overview?.open_deviations ?? 0) > 0,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Savings Banner */}
      {!loading && savings && (overview?.product_count !== 0 || overview?.supplier_count !== 0) && (
        <SavingsBanner
          totalSavings={savings.total_savings}
          priceAlertSavings={savings.price_alert_savings}
          deviationSavings={savings.deviation_savings}
          comparisonSavings={savings.comparison_savings}
        />
      )}

      {/* Empty State Onboarding */}
      {!loading && overview?.product_count === 0 && overview?.supplier_count === 0 && (
        <OnboardingCard onUploadClick={() => setShowUpload(true)} />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("title")}
          </h1>
          <p className="text-sm mt-0.5 text-gray-500">
            {t("description")}
          </p>
        </div>
        <div className="flex gap-2">
          {session && (
            <button
              className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-sm flex items-center gap-2"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="w-4 h-4" />
              {t("uploadInvoice")}
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`bg-white border rounded-xl p-6 ${s.alert ? 'border-red-300' : 'border-gray-200'} hover:border-pink-200 hover:shadow-md transition-all`}
            >
              {loading ? (
                <Skeleton className="h-16" />
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.alert ? 'bg-red-50 text-red-500' : 'bg-pink-50 text-pink-500'}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${s.alert ? 'text-red-500' : 'text-gray-900'}`}>
                      {s.value}
                    </p>
                    <p className="text-sm mt-0.5 text-gray-500">
                      {s.label}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      {overview?.recent_alerts?.length ? (
        <AlertBanner alerts={overview.recent_alerts} />
      ) : null}

      {/* Recent alerts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base text-gray-900">
            {t("recentAlerts")}
          </h2>
          <button
            onClick={() => router.push("/price-monitor/alerts")}
            className="flex items-center gap-1 text-xs text-pink-500 hover:text-pink-600 font-medium transition-all"
          >
            {t("showAll")} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : !overview?.recent_alerts?.length ? (
          <div
            className="bg-white rounded-xl border border-gray-200 p-8 text-center"
          >
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">
              {t("noAlerts")}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {overview.recent_alerts.slice(0, 10).map((alert: Alert, idx: number) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                last={idx === Math.min(overview.recent_alerts.length, 10) - 1}
                onClick={() =>
                  router.push(
                    alert.new_document_id
                      ? `/price-monitor/review/${alert.new_document_id}`
                      : `/price-monitor/products/${alert.product_id}`
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base text-gray-900">
            {t("recentAgreementDeviations")}
          </h2>
          <button
            onClick={() => router.push("/price-monitor/agreements/deviations")}
            className="flex items-center gap-1 text-xs text-pink-500 hover:text-pink-600 font-medium transition-all"
          >
            {t("showAll")} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : recentDeviations.length === 0 ? (
          <div
            className="bg-white rounded-xl border border-gray-200 p-8 text-center"
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">
              {t("noDeviations")}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {recentDeviations.slice(0, 5).map((deviation, idx) => (
              <DeviationOverviewRow
                key={deviation.id}
                deviation={deviation}
                last={idx === Math.min(recentDeviations.length, 5) - 1}
                onClick={() =>
                  router.push(`/price-monitor/agreements/${deviation.agreement_id}`)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-semibold text-base mb-4 text-gray-900">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {session && (
            <QuickAction
              icon={<Upload className="w-5 h-5" />}
              title={t("uploadInvoice")}
              desc={t("uploadInvoiceDesc")}
              onClick={() => setShowUpload(true)}
            />
          )}
          <QuickAction
            icon={<Package className="w-5 h-5" />}
            title={t("viewProducts")}
            desc={t("viewProductsDesc")}
            onClick={() => router.push("/price-monitor/products")}
          />
        </div>
      </section>

      {/* Activity Feed */}
      {!loading && activities.length > 0 && (
        <ActivityFeed activities={activities} />
      )}

      {/* Upload modal */}
      {showUpload && session && (
        <InvoiceUploadModal
          session={session}
          onClose={() => setShowUpload(false)}
          onProcessed={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

function AlertRow({
  alert,
  last,
  onClick,
}: {
  alert: Alert;
  last: boolean;
  onClick: () => void;
}) {
  const increase = alert.change_percent > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-pink-50 ${last ? '' : 'border-b border-gray-100'}`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${increase ? 'bg-red-50' : 'bg-emerald-50'}`}
      >
        {increase ? (
          <TrendingUp className="w-4 h-4 text-red-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-emerald-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-gray-900">
          {alert.product_name}
        </p>
        <p className="text-xs text-gray-500">
          {alert.supplier_name} · {formatDate(alert.new_invoice_date)}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${increase ? 'text-red-500' : 'text-emerald-500'}`}>
          {formatPercent(alert.change_percent)}
        </p>
        <p className="text-xs text-gray-500">
          {formatSEK(alert.previous_price)} → {formatSEK(alert.new_price)}
        </p>
      </div>

      <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
    </button>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 text-left transition-all hover:border-pink-200 hover:shadow-md"
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-pink-50 text-pink-500"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {title}
        </p>
        <p className="text-xs mt-0.5 text-gray-500">
          {desc}
        </p>
      </div>
    </button>
  );
}

function DeviationOverviewRow({
  deviation,
  last,
  onClick,
}: {
  deviation: AgreementDeviation;
  last: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("dashboard");
  const typeColors: Record<AgreementDeviation["deviation_type"], { bg: string; text: string }> = {
    wrong_supplier: { bg: "bg-red-50", text: "text-red-600" },
    price_above_agreed: { bg: "bg-amber-50", text: "text-amber-600" },
    no_discount_applied: { bg: "bg-amber-50", text: "text-amber-600" },
    expired_agreement: { bg: "bg-gray-50", text: "text-gray-500" },
  };

  const typeLabels: Record<AgreementDeviation["deviation_type"], string> = {
    wrong_supplier: t("deviationTypes.wrong_supplier"),
    price_above_agreed: t("deviationTypes.price_above_agreed"),
    no_discount_applied: t("deviationTypes.no_discount_applied"),
    expired_agreement: t("deviationTypes.expired_agreement"),
  };

  const typeStyle = typeColors[deviation.deviation_type];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-pink-50 transition-colors ${last ? '' : 'border-b border-gray-100'}`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${typeStyle.bg} ${typeStyle.text}`}
      >
        <FileText className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-gray-900">
            {deviation.description}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium border border-opacity-20 ${typeStyle.bg} ${typeStyle.text}`}
          >
            {typeLabels[deviation.deviation_type]}
          </span>
        </div>
        <p className="text-xs mt-1 text-gray-500">
          {deviation.agreements.name}
          {deviation.invoice_date ? ` · ${formatDate(deviation.invoice_date)}` : ""}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-red-500">
          {deviation.potential_savings != null
            ? formatSEK(deviation.potential_savings)
            : "–"}
        </p>
        <p className="text-xs text-gray-500">
          {t("possibleSavings")}
        </p>
      </div>

      <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
    </button>
  );
}
