"use client";

import { AlertTriangle, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/index";
import { formatDate, formatSEK, type Agreement } from "@/lib/price-monitor-api";

interface AgreementCardProps {
  agreement: Agreement;
  deviationCount: number;
  onEdit: () => void;
  onOpen: () => void;
}

export function AgreementCard({
  agreement,
  deviationCount,
  onEdit,
  onOpen,
}: AgreementCardProps) {
  const status = getAgreementStatusMeta(agreement);
  const visibleItems = agreement.agreement_items.slice(0, 3);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">{status.emoji}</span>
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {agreement.name}
            </h2>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {agreement.suppliers.name}
          </p>
        </div>

        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            background: status.background,
            color: status.color,
          }}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {agreement.agreement_number ? (
          <div className="flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
            <FileText className="h-4 w-4" />
            <span>Avtalsnr: {agreement.agreement_number}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
          <CalendarDays className="h-4 w-4" />
          <span>
            Gäller: {formatDate(agreement.start_date)} {"->"}{" "}
            {agreement.end_date ? formatDate(agreement.end_date) : "Tills vidare"}
          </span>
        </div>

        {agreement.discount_percent != null ? (
          <p style={{ color: "var(--color-text-secondary)" }}>
            Generell rabatt: {agreement.discount_percent.toString().replace(".", ",")}%
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
          Avtalsrader
        </p>
        {visibleItems.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Inga avtalsrader registrerade ännu.
          </p>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((item) => (
              <p key={item.id} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                • {formatAgreementItem(item)}
              </p>
            ))}
            {agreement.agreement_items.length > visibleItems.length ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                +{agreement.agreement_items.length - visibleItems.length} fler rader
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
          style={{
            background: deviationCount > 0 ? "#fef2f2" : "var(--color-bg-secondary)",
            color: deviationCount > 0 ? "#ef4444" : "var(--color-text-muted)",
          }}
        >
          <AlertTriangle className="h-4 w-4" />
          {deviationCount} avvikelser
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Redigera
          </Button>
          <Button variant="primary" size="sm" onClick={onOpen}>
            Detaljer
          </Button>
        </div>
      </div>
    </div>
  );
}

export function getAgreementStatusMeta(agreement: Agreement) {
  if (agreement.status === "terminated") {
    return {
      label: "Avslutat",
      emoji: "⚫",
      color: "#6b7280",
      background: "#f3f4f6",
    };
  }

  if (agreement.status === "expired" || isAgreementExpired(agreement)) {
    return {
      label: "Utgånget",
      emoji: "🔴",
      color: "#ef4444",
      background: "#fef2f2",
    };
  }

  if (isAgreementExpiringSoon(agreement)) {
    return {
      label: "Går snart ut",
      emoji: "🟡",
      color: "#f59e0b",
      background: "#fffbeb",
    };
  }

  return {
    label: "Aktivt",
    emoji: "🟢",
    color: "#10b981",
    background: "#ecfdf5",
  };
}

function isAgreementExpired(agreement: Agreement) {
  if (!agreement.end_date) return false;
  return new Date(agreement.end_date) < new Date(new Date().toDateString());
}

function isAgreementExpiringSoon(agreement: Agreement) {
  if (!agreement.end_date || agreement.status !== "active") return false;
  const today = new Date(new Date().toDateString()).getTime();
  const end = new Date(agreement.end_date).getTime();
  const diffDays = (end - today) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

function formatAgreementItem(item: Agreement["agreement_items"][number]) {
  const label =
    item.product_groups?.name ??
    item.spend_categories?.name ??
    item.description ??
    "Okänd rad";

  if (item.max_price != null) {
    return `${label}: max ${formatSEK(item.max_price)}${item.unit ? `/${item.unit}` : ""}`;
  }

  if (item.agreed_price != null) {
    return `${label}: ${formatSEK(item.agreed_price)}${item.unit ? `/${item.unit}` : ""}`;
  }

  if (item.discount_percent != null) {
    return `${label}: ${item.discount_percent.toString().replace(".", ",")}% rabatt`;
  }

  return label;
}
