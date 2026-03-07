"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, PiggyBank } from "lucide-react";
import { Card, Select, Skeleton } from "@/components/ui/index";
import { DeviationRow } from "@/components/price-monitor/deviation-row";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchAgreements,
  fetchDeviations,
  formatSEK,
  type Agreement,
  type AgreementDeviation,
} from "@/lib/price-monitor-api";

type DeviationTab = "all" | AgreementDeviation["status"];

const TABS: Array<{ id: DeviationTab; label: string }> = [
  { id: "all", label: "Alla" },
  { id: "new", label: "Nya" },
  { id: "reviewed", label: "Granskade" },
  { id: "dismissed", label: "Avfärdade" },
  { id: "actioned", label: "Åtgärdade" },
];

export default function AgreementDeviationsPage() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [deviations, setDeviations] = useState<AgreementDeviation[]>([]);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviationTab>("all");
  const [agreementFilter, setAgreementFilter] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    if (!authSession) {
      router.push("/auth/login");
      return;
    }

    setSession(authSession);
    setError("");

    try {
      const params: { status?: string; agreement_id?: string } = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (agreementFilter) params.agreement_id = agreementFilter;

      const [agreementData, deviationData] = await Promise.all([
        fetchAgreements({}, authSession),
        fetchDeviations(params, authSession),
      ]);

      setAgreements(agreementData);
      setDeviations(deviationData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Kunde inte hämta avtalsavvikelser."
      );
    } finally {
      setLoading(false);
    }
  }, [agreementFilter, router, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPotentialSavings = useMemo(() => {
    return deviations.reduce(
      (sum, deviation) => sum + (deviation.potential_savings ?? 0),
      0
    );
  }, [deviations]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: deviations.length };
    deviations.forEach((deviation) => {
      counts[deviation.status] = (counts[deviation.status] ?? 0) + 1;
    });
    return counts;
  }, [deviations]);

  function handleDeviationUpdated(
    deviationId: string,
    status: AgreementDeviation["status"],
    notes: string | null
  ) {
    setDeviations((prev) =>
      prev.map((deviation) =>
        deviation.id === deviationId ? { ...deviation, status, notes } : deviation
      )
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <button
        type="button"
        onClick={() => router.push("/price-monitor/agreements")}
        className="inline-flex items-center gap-2 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till avtal
      </button>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Avtalsavvikelser
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Samlad vy över alla fakturarader som bryter mot registrerade avtal.
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error-text)" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          {loading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "var(--color-error-bg)" }}
              >
                <AlertTriangle className="h-6 w-6" style={{ color: "#ef4444" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {deviations.length}
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Totala avvikelser
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          {loading ? (
            <Skeleton className="h-20 rounded-xl" />
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "#ecfdf5" }}
              >
                <PiggyBank className="h-6 w-6" style={{ color: "#10b981" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {formatSEK(totalPotentialSavings)}
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Total möjlig besparing
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,280px)] gap-4 items-end">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
              Status
            </p>
            <div
              className="flex flex-wrap gap-1 rounded-xl p-1"
              style={{ background: "var(--color-bg-secondary)" }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                  style={{
                    background:
                      statusFilter === tab.id
                        ? "var(--color-bg-elevated)"
                        : "transparent",
                    color:
                      statusFilter === tab.id
                        ? "var(--color-text-primary)"
                        : "var(--color-text-muted)",
                    boxShadow:
                      statusFilter === tab.id ? "var(--shadow-sm)" : "none",
                  }}
                >
                  {tab.label}
                  <span
                    className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
                    style={{
                      background:
                        statusFilter === tab.id
                          ? "var(--color-accent-muted)"
                          : "var(--color-bg)",
                      color:
                        statusFilter === tab.id
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {tabCounts[tab.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Select
            label="Avtal"
            value={agreementFilter}
            onChange={(e) => setAgreementFilter(e.target.value)}
            options={[
              { value: "", label: "Alla avtal" },
              ...agreements.map((agreement) => ({
                value: agreement.id,
                label: agreement.name,
              })),
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : !session ? null : deviations.length === 0 ? (
          <div className="p-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Inga avvikelser hittades för det valda filtret.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead
                style={{
                  background: "var(--color-bg-secondary)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <tr>
                  {[
                    "Typ",
                    "Avtal",
                    "Produkt",
                    "Faktiskt pris",
                    "Avtalat pris",
                    "Möjlig besparing",
                    "Datum",
                    "Status",
                    "Åtgärd",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background: "var(--color-bg-elevated)" }}>
                {deviations.map((deviation) => (
                  <DeviationRow
                    key={deviation.id}
                    deviation={deviation}
                    session={session}
                    colSpan={9}
                    showAgreement
                    onUpdated={handleDeviationUpdated}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
