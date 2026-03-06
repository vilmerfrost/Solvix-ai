"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/index";
import { SupplierCard } from "@/components/price-monitor/supplier-card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchDashboard, Supplier } from "@/lib/price-monitor-api";

export default function SuppliersPage() {
  const router = useRouter();
  const t = useTranslations("suppliers");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }

      try {
        const data = await fetchDashboard<Supplier[]>("suppliers", undefined, session);
        setSuppliers(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("error"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, t]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t("title")}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {loading ? "…" : t("count", { count: suppliers.length })}
        </p>
      </div>

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "#fef2f2", color: "#ef4444" }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border)",
          }}
        >
          <Building2
            className="w-10 h-10 mx-auto mb-3"
            style={{ color: "var(--color-text-muted)" }}
          />
          <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
            {t("emptyTitle")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <SupplierCard key={s.supplier_id} supplier={s} />
          ))}
        </div>
      )}
    </div>
  );
}
