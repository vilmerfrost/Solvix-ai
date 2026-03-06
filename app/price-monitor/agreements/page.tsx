"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Plus } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
} from "@/components/ui/index";
import { AgreementCard } from "@/components/price-monitor/agreement-card";
import { AgreementForm } from "@/components/price-monitor/agreement-form";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchAgreements,
  fetchCategories,
  fetchDashboard,
  fetchDeviations,
  fetchProductGroups,
  type Agreement,
  type AgreementDeviation,
  type ProductGroup,
  type SpendCategory,
  type Supplier,
} from "@/lib/price-monitor-api";

type AgreementTab = "all" | "active" | "expired" | "terminated";

const TABS: Array<{ id: AgreementTab; label: string }> = [
  { id: "all", label: "Alla" },
  { id: "active", label: "Aktiva" },
  { id: "expired", label: "Utgångna" },
  { id: "terminated", label: "Avslutade" },
];

export default function AgreementsPage() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [deviations, setDeviations] = useState<AgreementDeviation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [categories, setCategories] = useState<SpendCategory[]>([]);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgreementTab>("all");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);

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
      const params: { supplier_id?: string; status?: string } = {};
      if (supplierFilter) params.supplier_id = supplierFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const [
        agreementData,
        deviationData,
        supplierData,
        groupData,
        categoryData,
      ] = await Promise.all([
        fetchAgreements(params, authSession),
        fetchDeviations({}, authSession),
        fetchDashboard<Supplier[]>("suppliers", {}, authSession),
        fetchProductGroups(authSession),
        fetchCategories(authSession),
      ]);

      setAgreements(agreementData);
      setDeviations(deviationData);
      setSuppliers(supplierData);
      setProductGroups(groupData);
      setCategories(categoryData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Kunde inte hämta avtal."
      );
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter, supplierFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const deviationCountByAgreement = useMemo(() => {
    return deviations.reduce<Record<string, number>>((acc, deviation) => {
      acc[deviation.agreement_id] = (acc[deviation.agreement_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [deviations]);

  const activeAgreementCount = useMemo(
    () => agreements.filter((agreement) => agreement.status === "active").length,
    [agreements]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agreements.length };
    agreements.forEach((agreement) => {
      counts[agreement.status] = (counts[agreement.status] ?? 0) + 1;
    });
    return counts;
  }, [agreements]);

  function openCreateModal() {
    setSelectedAgreement(null);
    setFormMode("create");
  }

  function openEditModal(agreement: Agreement) {
    setSelectedAgreement(agreement);
    setFormMode("edit");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Avtal"
        description="Registrera leverantörsavtal och upptäck fakturor som bryter mot överenskomna priser eller rabatter."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={() => router.push("/price-monitor/agreements/deviations")}
            >
              Visa avvikelser
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreateModal}
            >
              Skapa avtal
            </Button>
          </>
        }
      />

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error-text)" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-4 items-end">
            <Select
              label="Leverantör"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              options={[
                { value: "", label: "Alla leverantörer" },
                ...suppliers.map((supplier) => ({
                  value: supplier.supplier_id,
                  label: supplier.supplier_name,
                })),
              ]}
            />

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
          </div>
        </Card>

        <Card>
          <div className="min-w-[240px]">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Sammanfattning
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {activeAgreementCount} aktiva avtal
            </p>
            <p className="mt-1 text-sm" style={{ color: deviations.length > 0 ? "#ef4444" : "var(--color-text-muted)" }}>
              {deviations.length} avvikelser
            </p>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : agreements.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Inga avtal registrerade"
            description="Skapa ditt första avtal för att automatiskt upptäcka avvikelser."
            action={
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreateModal}
              >
                Skapa ditt första avtal
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {agreements.map((agreement) => (
            <AgreementCard
              key={agreement.id}
              agreement={agreement}
              deviationCount={deviationCountByAgreement[agreement.id] ?? 0}
              onEdit={() => openEditModal(agreement)}
              onOpen={() => router.push(`/price-monitor/agreements/${agreement.id}`)}
            />
          ))}
        </div>
      )}

      {formMode && session ? (
        <AgreementForm
          open={Boolean(formMode)}
          mode={formMode}
          agreement={selectedAgreement}
          suppliers={suppliers}
          productGroups={productGroups}
          categories={categories}
          session={session}
          onClose={() => setFormMode(null)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
