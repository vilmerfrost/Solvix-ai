"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle, ChevronDown, ChevronUp, Phone, Repeat, Zap } from "lucide-react";
import { Button } from "@/components/ui/index";
import { Alert, updateAlert } from "@/lib/price-monitor-api";

interface AlertActionsProps {
  alert: Alert;
  session: { access_token: string };
  onUpdated: (alertId: string, newStatus: Alert["status"]) => void;
  comparisonHref?: string;
}

export function AlertActions({
  alert,
  session,
  onUpdated,
  comparisonHref = "/price-monitor/spend/compare",
}: AlertActionsProps) {
  const router = useRouter();
  const t = useTranslations("alerts.actions");
  const [loading, setLoading] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [notes, setNotes] = useState(alert.notes ?? "");

  if (alert.status !== "new") {
    return (
      <span
        className="text-xs px-2 py-1 rounded-md"
        style={{
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-muted)",
        }}
      >
        {statusLabel(alert.status, t)}
      </span>
    );
  }

  async function act(status: "reviewed" | "dismissed" | "actioned", nextNotes?: string) {
    setLoading(status);
    try {
      const value = nextNotes ?? notes;
      await updateAlert(alert.id, status, value || null, session);
      onUpdated(alert.id, status);
      setShowMenu(false);
    } catch {
      // silently ignore — parent can add toast if needed
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="xs"
          variant="secondary"
          icon={<CheckCircle className="w-3.5 h-3.5" />}
          loading={loading === "reviewed"}
          onClick={() => act("reviewed")}
        >
          {t("reviewed")}
        </Button>
        <Button
          size="xs"
          variant="primary"
          icon={<Zap className="w-3.5 h-3.5" />}
          loading={loading === "actioned"}
          onClick={() => setShowMenu((prev) => !prev)}
        >
          {t("takeAction")}
          {!showMenu ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </Button>
      </div>

      {showMenu && (
        <div
          className="space-y-2 rounded-lg border p-3"
          style={{
            background: "var(--color-bg-elevated)",
            borderColor: "var(--color-border)",
          }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-black/5"
            style={{ color: "var(--color-text-primary)" }}
            onClick={() => {
              const next = t("contactSupplier");
              setNotes(next);
              act("actioned", next);
            }}
          >
            <Phone className="h-3.5 w-3.5" />
            {t("contactSupplier")}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-black/5"
            style={{ color: "var(--color-text-primary)" }}
            onClick={() => {
              const next = t("approvePrice");
              setNotes(next);
              act("dismissed", next);
            }}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {t("approvePrice")}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-black/5"
            style={{ color: "var(--color-text-primary)" }}
            onClick={() => {
              const next = t("switchSupplier");
              setNotes(next);
              act("actioned", next);
              router.push(comparisonHref);
            }}
          >
            <Repeat className="h-3.5 w-3.5" />
            {t("switchSupplier")}
          </button>
          <textarea
            className="w-full resize-none rounded-lg border px-3 py-2 text-xs"
            style={{
              background: "var(--color-bg)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            rows={2}
            placeholder={t("notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function statusLabel(status: Alert["status"], t: (key: string) => string) {
  switch (status) {
    case "reviewed": return t("status.reviewed");
    case "dismissed": return t("status.dismissed");
    case "actioned": return t("status.actioned");
    default: return status;
  }
}
