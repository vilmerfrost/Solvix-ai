"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/index";
import { Alert, updateAlert } from "@/lib/price-monitor-api";

interface AlertActionsProps {
  alert: Alert;
  session: { access_token: string };
  onUpdated: (alertId: string, newStatus: Alert["status"]) => void;
}

export function AlertActions({ alert, session, onUpdated }: AlertActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
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
        {statusLabel(alert.status)}
      </span>
    );
  }

  async function act(status: "reviewed" | "dismissed" | "actioned") {
    setLoading(status);
    try {
      await updateAlert(alert.id, status, notes || null, session);
      onUpdated(alert.id, status);
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
          Granskad
        </Button>
        <Button
          size="xs"
          variant="secondary"
          icon={<XCircle className="w-3.5 h-3.5" />}
          loading={loading === "dismissed"}
          onClick={() => act("dismissed")}
        >
          Avfärda
        </Button>
        <Button
          size="xs"
          variant="primary"
          icon={<Zap className="w-3.5 h-3.5" />}
          loading={loading === "actioned"}
          onClick={() => (showNotes ? act("actioned") : setShowNotes(true))}
        >
          Åtgärdad
          {!showNotes ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </Button>
      </div>

      {showNotes && (
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-xs resize-none"
          style={{
            background: "var(--color-bg)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
          rows={2}
          placeholder="Anteckningar (valfritt)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      )}
    </div>
  );
}

function statusLabel(status: Alert["status"]) {
  switch (status) {
    case "reviewed": return "Granskad";
    case "dismissed": return "Avfärdad";
    case "actioned": return "Åtgärdad";
    default: return status;
  }
}
