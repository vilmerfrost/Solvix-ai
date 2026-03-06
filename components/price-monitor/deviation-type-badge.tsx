"use client";

import {
  AlertCircle,
  Ban,
  CircleDollarSign,
  TriangleAlert,
} from "lucide-react";
import type { AgreementDeviation } from "@/lib/price-monitor-api";

type DeviationType = AgreementDeviation["deviation_type"];
type DeviationStatus = AgreementDeviation["status"];

export function getDeviationTypeMeta(type: DeviationType) {
  switch (type) {
    case "wrong_supplier":
      return {
        label: "Köpt från fel leverantör",
        shortLabel: "Fel leverantör",
        color: "#ef4444",
        background: "#fef2f2",
        Icon: Ban,
      };
    case "price_above_agreed":
      return {
        label: "Pris över avtalat max",
        shortLabel: "Över maxpris",
        color: "#f97316",
        background: "#fff7ed",
        Icon: TriangleAlert,
      };
    case "no_discount_applied":
      return {
        label: "Rabatt ej tillämpad",
        shortLabel: "Rabatt saknas",
        color: "#eab308",
        background: "#fefce8",
        Icon: CircleDollarSign,
      };
    case "expired_agreement":
      return {
        label: "Utgånget avtal",
        shortLabel: "Utgånget avtal",
        color: "#6b7280",
        background: "#f3f4f6",
        Icon: AlertCircle,
      };
    default:
      return {
        label: type,
        shortLabel: type,
        color: "var(--color-text-muted)",
        background: "var(--color-bg-secondary)",
        Icon: AlertCircle,
      };
  }
}

export function getDeviationStatusLabel(status: DeviationStatus) {
  switch (status) {
    case "new":
      return "Ny";
    case "reviewed":
      return "Granskad";
    case "dismissed":
      return "Avfärdad";
    case "actioned":
      return "Åtgärdad";
    default:
      return status;
  }
}

export function DeviationTypeBadge({
  type,
  compact = false,
}: {
  type: DeviationType;
  compact?: boolean;
}) {
  const meta = getDeviationTypeMeta(type);
  const Icon = meta.Icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: meta.background,
        color: meta.color,
      }}
      title={meta.label}
    >
      <Icon className="h-3.5 w-3.5" />
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}
