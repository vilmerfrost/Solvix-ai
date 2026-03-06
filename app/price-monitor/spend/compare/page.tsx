"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Layers3 } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui/index";
import { ComparisonTable } from "@/components/price-monitor/comparison-table";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  fetchComparison,
  fetchProductGroups,
  type ProductGroup,
  type SupplierComparisonRow,
} from "@/lib/price-monitor-api";

export default function SupplierComparisonPage() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [rows, setRows] = useState<SupplierComparisonRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
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
        const [groupData, comparisonData] = await Promise.all([
          fetchProductGroups(session),
          fetchComparison(selectedGroupId || null, session),
        ]);
        setGroups(groupData);
        setRows(comparisonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunde inte hämta jämförelser.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [selectedGroupId]);

  const hasGroups = groups.length > 0;
  const filteredRows = useMemo(() => {
    if (!selectedGroupId) return rows;
    return rows.filter((row) => row.group_id === selectedGroupId);
  }, [rows, selectedGroupId]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Leverantörsjämförelse"
        description="Jämför samma produktgrupper mellan leverantörer och se var ni betalar mer än nödvändigt."
      />

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error-text)" }}
        >
          {error}
        </div>
      )}

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Filtrera på produktgrupp
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Välj en grupp för att fokusera på en viss typ av inköp
            </p>
          </div>
          <select
            className="rounded-lg border px-3 py-2 text-sm min-w-64"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">Alla produktgrupper</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : !hasGroups ? (
        <Card>
          <EmptyState
            icon={<Layers3 className="w-6 h-6" />}
            title="Skapa produktgrupper först"
            description="Produktgrupper behövs för att jämföra samma typ av vara mellan olika leverantörer."
            action={
              <Button
                variant="primary"
                icon={<ArrowRightLeft className="w-4 h-4" />}
                onClick={() => {
                  window.location.href = "/price-monitor/spend/groups";
                }}
              >
                Gå till produktgrupper
              </Button>
            }
          />
        </Card>
      ) : filteredRows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowRightLeft className="w-6 h-6" />}
            title="Ingen jämförelsedata ännu"
            description="När produkter har grupperats och köpts från flera leverantörer visas jämförelser här."
          />
        </Card>
      ) : (
        <ComparisonTable rows={filteredRows} />
      )}
    </div>
  );
}
