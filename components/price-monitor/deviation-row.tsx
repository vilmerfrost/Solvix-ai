"use client";

import { useState } from "react";
import { Button } from "@/components/ui/index";
import {
  formatDate,
  formatSEK,
  updateDeviation,
  type AgreementDeviation,
} from "@/lib/price-monitor-api";
import {
  DeviationTypeBadge,
  getDeviationStatusLabel,
} from "@/components/price-monitor/deviation-type-badge";

interface DeviationRowProps {
  deviation: AgreementDeviation;
  session: { access_token: string };
  colSpan: number;
  showAgreement?: boolean;
  onUpdated: (
    deviationId: string,
    status: AgreementDeviation["status"],
    notes: string | null
  ) => void;
}

export function DeviationRow({
  deviation,
  session,
  colSpan,
  showAgreement = false,
  onUpdated,
}: DeviationRowProps) {
  const [loading, setLoading] = useState<AgreementDeviation["status"] | null>(null);
  const [notesMode, setNotesMode] = useState<"dismissed" | "actioned" | null>(null);
  const [notes, setNotes] = useState(deviation.notes ?? "");

  async function submitStatus(
    status: "reviewed" | "dismissed" | "actioned",
    nextNotes: string | null
  ) {
    setLoading(status);
    try {
      await updateDeviation(deviation.id, status, nextNotes, session);
      onUpdated(deviation.id, status, nextNotes);
      setNotesMode(null);
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
        <td className="px-4 py-3 align-top">
          <DeviationTypeBadge type={deviation.deviation_type} compact />
        </td>
        {showAgreement ? (
          <td className="px-4 py-3 align-top" style={{ color: "var(--color-text-primary)" }}>
            {deviation.agreements.name}
          </td>
        ) : null}
        <td className="px-4 py-3 align-top" style={{ color: "var(--color-text-primary)" }}>
          <div>
            <p>{deviation.products?.name ?? "Okänd produkt"}</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {deviation.description}
            </p>
          </div>
        </td>
        <td className="px-4 py-3 align-top" style={{ color: "var(--color-text-primary)" }}>
          {deviation.actual_price != null ? formatSEK(deviation.actual_price) : "–"}
        </td>
        <td className="px-4 py-3 align-top" style={{ color: "var(--color-text-primary)" }}>
          {deviation.agreed_price != null ? formatSEK(deviation.agreed_price) : "–"}
        </td>
        <td className="px-4 py-3 align-top" style={{ color: "var(--color-text-primary)" }}>
          {deviation.potential_savings != null
            ? formatSEK(deviation.potential_savings)
            : "–"}
        </td>
        <td className="px-4 py-3 align-top" style={{ color: "var(--color-text-primary)" }}>
          {deviation.invoice_date ? formatDate(deviation.invoice_date) : "–"}
        </td>
        <td className="px-4 py-3 align-top">
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background:
                deviation.status === "new"
                  ? "var(--color-accent-muted)"
                  : "var(--color-bg-secondary)",
              color:
                deviation.status === "new"
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
            }}
          >
            {getDeviationStatusLabel(deviation.status)}
          </span>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              variant="secondary"
              loading={loading === "reviewed"}
              onClick={() => submitStatus("reviewed", notes.trim() || null)}
            >
              Granska
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => setNotesMode(notesMode === "dismissed" ? null : "dismissed")}
            >
              Avfärda
            </Button>
            <Button
              size="xs"
              variant="primary"
              onClick={() => setNotesMode(notesMode === "actioned" ? null : "actioned")}
            >
              Åtgärda
            </Button>
          </div>
        </td>
      </tr>

      {notesMode ? (
        <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
          <td
            colSpan={colSpan}
            className="px-4 py-4"
            style={{ background: "var(--color-bg-secondary)" }}
          >
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {notesMode === "dismissed"
                    ? "Anteckning för avfärdande"
                    : "Vad gjordes för att åtgärda avvikelsen?"}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {notesMode === "dismissed"
                    ? "Anteckning är valfri."
                    : "Lägg gärna till en kort anteckning."}
                </p>
              </div>

              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
                placeholder="Skriv en kort anteckning..."
              />

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setNotesMode(null)}
                >
                  Avbryt
                </Button>
                <Button
                  size="sm"
                  variant={notesMode === "dismissed" ? "secondary" : "primary"}
                  loading={loading === notesMode}
                  onClick={() => submitStatus(notesMode, notes.trim() || null)}
                >
                  {notesMode === "dismissed" ? "Bekräfta avfärdande" : "Bekräfta åtgärd"}
                </Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
