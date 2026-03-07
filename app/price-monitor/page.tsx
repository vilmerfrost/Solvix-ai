"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package, AlertTriangle, Upload, ArrowRight,
  Sparkles, BarChart3, FileText, Scale, Settings,
  PenLine, Truck, CheckCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/index";
import { InvoiceUploadModal } from "@/components/price-monitor/invoice-upload-modal";
import { ActivityFeed, ActivityItem } from "@/components/price-monitor/activity-feed";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchDashboard,
  fetchDeviations,
  AgreementDeviation,
  DashboardOverview,
  formatSEK,
  formatPercent,
  formatDate,
} from "@/lib/price-monitor-api";

export default function PriceMonitorDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(null);
  const [savings, setSavings] = useState<{ total_savings: number } | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s as { access_token: string; user: { id: string } });

    try {
      const [overviewData] = await Promise.all([
        fetchDashboard<DashboardOverview>("overview", undefined, s),
        fetchDeviations({ status: "new" }, s).catch(() => []),
      ]);
      setOverview(overviewData);

      const { data: savingsData } = await supabase.from("v_savings_summary").select("total_savings").eq("user_id", s.user.id).single();
      setSavings(savingsData ?? { total_savings: 0 });

      const [recentDocs, recentAlerts] = await Promise.all([
        supabase.from("documents").select("id, sender_name, processed_at, created_at").eq("user_id", s.user.id).eq("document_domain", "invoice").order("created_at", { ascending: false }).limit(5),
        supabase.from("price_alerts").select("id, change_percent, created_at, products(name)").eq("user_id", s.user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      const feed: ActivityItem[] = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(recentDocs.data || []).map((d: any) => ({ type: "invoice" as const, text: `Faktura från ${d.sender_name || "Okänd"} bearbetad`, date: d.processed_at || d.created_at })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(recentAlerts.data || []).map((a: any) => ({ type: "alert" as const, text: `Prisförändring: ${a.products?.name} ${a.change_percent > 0 ? "+" : ""}${a.change_percent}%`, date: a.created_at })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
      setActivities(feed);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const openAlerts = overview?.open_alerts ?? 0;
  const openDeviations = overview?.open_deviations ?? 0;
  const totalBadge = openAlerts + openDeviations;

  const actions = [
    { href: "#upload", title: "Ladda upp faktura", desc: "Ladda upp en PDF och låt AI extrahera data", icon: Upload, badge: null, onClick: () => setShowUpload(true) },
    { href: "/price-monitor/manual-entry", title: "Manuell registrering", desc: "Registrera en faktura manuellt utan PDF", icon: PenLine, badge: null, onClick: null },
    { href: "/price-monitor/products", title: "Produkter", desc: "Se alla spårade produkter och prishistorik", icon: Package, badge: overview?.product_count ? `${overview.product_count}` : null, onClick: null },
    { href: "/price-monitor/alerts", title: "Varningar", desc: "Prisförändringar och avtalsavvikelser", icon: AlertTriangle, badge: totalBadge > 0 ? `${totalBadge} nya` : null, badgeAlert: true, onClick: null },
    { href: "/price-monitor/spend", title: "Inköpsanalys", desc: "Utgiftsöversikt med grafer och AI-insikter", icon: BarChart3, badge: null, onClick: null },
    { href: "/price-monitor/settings", title: "Inställningar", desc: "Fortnox, avtal och varningströsklar", icon: Settings, badge: null, onClick: null },
  ];

  return (
    <div className="space-y-0 -m-6 lg:-m-8">
      {/* Hero banner */}
      <section className="bg-gradient-to-br from-pink-50 via-purple-50/50 to-blue-50/30 px-8 py-14 text-center border-b border-gray-100">
        <div className="inline-flex items-center gap-2 bg-white/80 border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-600 mb-5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-pink-500" />
          AI-driven fakturaanalys
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          Smarta{" "}
          <span className="text-pink-500">
            {loading ? "..." : savings?.total_savings ? formatSEK(savings.total_savings) : "Besparingar"}
          </span>
        </h1>
        <p className="text-gray-500 text-sm max-w-xl mx-auto mb-7">
          Ladda upp fakturor, spåra priser, hitta avtalsavvikelser och identifiera besparingar — allt med AI.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {session && (
            <button
              onClick={() => setShowUpload(true)}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Ladda upp faktura
            </button>
          )}
          <Link
            href="/price-monitor/products"
            className="bg-white border border-gray-300 hover:border-pink-300 text-gray-700 px-6 py-2.5 rounded-full font-medium text-sm transition-colors"
          >
            Visa produkter
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="flex flex-wrap items-center justify-center gap-8 max-w-3xl mx-auto">
          {loading ? (
            <Skeleton className="h-6 w-64 rounded" />
          ) : (
            <>
              <StatItem icon={<Package className="w-4 h-4 text-pink-400" />} value={overview?.product_count ?? 0} label="Produkter" />
              <StatItem icon={<Truck className="w-4 h-4 text-purple-400" />} value={overview?.supplier_count ?? 0} label="Leverantörer" />
              <StatItem icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} value={openAlerts} label="Prisvarningar" alert={openAlerts > 0} />
              <StatItem icon={<FileText className="w-4 h-4 text-blue-400" />} value={openDeviations} label="Avvikelser" alert={openDeviations > 0} />
              {savings?.total_savings ? (
                <StatItem icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} value={formatSEK(savings.total_savings)} label="Identifierade besparingar" />
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="px-8 py-8 max-w-5xl mx-auto space-y-10">
        {/* Action cards */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Vad vill du göra?</h2>
            <p className="text-gray-500 text-sm mt-1">Välj en åtgärd för att komma igång</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              const inner = (
                <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-pink-200 transition-all group cursor-pointer h-full">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center mb-3 group-hover:bg-pink-100 transition-colors">
                    <Icon className="w-5 h-5 text-pink-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900">{action.title}</p>
                    {action.badge && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${action.badgeAlert ? "bg-red-100 text-red-600" : "bg-pink-100 text-pink-600"}`}>
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">{action.desc}</p>
                </div>
              );
              return action.onClick ? (
                <button key={action.title} onClick={action.onClick} className="text-left h-full">
                  {inner}
                </button>
              ) : (
                <Link key={action.title} href={action.href} className="h-full">
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent alerts mini-list */}
        {!loading && (overview?.recent_alerts?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-base text-gray-900">Senaste varningar</h2>
              <button onClick={() => router.push("/price-monitor/alerts")} className="flex items-center gap-1 text-xs text-pink-500 hover:text-pink-600 font-medium">
                Visa alla <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {overview!.recent_alerts.slice(0, 5).map((alert, idx) => {
                const increase = alert.change_percent > 0;
                return (
                  <button
                    key={alert.id}
                    onClick={() => router.push(alert.new_document_id ? `/price-monitor/review/${alert.new_document_id}` : `/price-monitor/products/${alert.product_id}`)}
                    className={`w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-pink-50 transition-colors ${idx < Math.min(overview!.recent_alerts.length, 5) - 1 ? "border-b border-gray-100" : ""}`}
                  >
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${increase ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {formatPercent(alert.change_percent)}
                    </span>
                    <span className="text-sm text-gray-900 font-medium flex-1 truncate">{alert.product_name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(alert.new_invoice_date)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Activity Feed */}
        {!loading && activities.length > 0 && (
          <ActivityFeed activities={activities} />
        )}
      </div>

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

function StatItem({ icon, value, label, alert }: { icon: React.ReactNode; value: number | string; label: string; alert?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className={`font-bold ${alert ? "text-red-500" : "text-gray-900"}`}>{value}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  );
}
