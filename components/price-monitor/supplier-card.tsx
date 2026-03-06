"use client";

import { useRouter } from "next/navigation";
import { Building2, FileText, Package, AlertTriangle, Calendar } from "lucide-react";
import { Supplier, formatDate } from "@/lib/price-monitor-api";

interface SupplierCardProps {
  supplier: Supplier;
}

export function SupplierCard({ supplier }: SupplierCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() =>
        router.push(`/price-monitor/products?supplier_id=${supplier.supplier_id}`)
      }
      className="w-full text-left rounded-xl border p-5 transition-all duration-150 hover:shadow-md"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-bg-secondary)" }}
          >
            <Building2 className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
          </div>
          <div className="min-w-0">
            <p
              className="font-semibold text-sm truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {supplier.supplier_name}
            </p>
            {supplier.org_number && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Org.nr {supplier.org_number}
              </p>
            )}
          </div>
        </div>

        {supplier.open_alerts > 0 && (
          <span
            className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "#fef2f2", color: "#ef4444" }}
          >
            <AlertTriangle className="w-3 h-3" />
            {supplier.open_alerts}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
          <div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Fakturor
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {supplier.invoice_count}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
          <div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Produkter
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {supplier.product_count}
            </p>
          </div>
        </div>
      </div>

      {/* Date range */}
      <div
        className="flex items-center gap-1.5 mt-4 pt-3 border-t text-xs"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <Calendar className="w-3 h-3" />
        {formatDate(supplier.first_invoice)} – {formatDate(supplier.last_invoice)}
      </div>
    </button>
  );
}
