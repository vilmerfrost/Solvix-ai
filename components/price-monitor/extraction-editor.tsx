"use client";

import { Badge } from "@/components/ui/index";
import {
  InvoiceForm,
  type InvoiceFormData,
} from "@/components/price-monitor/invoice-form";
import {
  LineItemsEditor,
  type LineItemForm,
} from "@/components/price-monitor/line-items-editor";

interface ExtractionEditorProps {
  formData: InvoiceFormData;
  lineItems: LineItemForm[];
  classification?: string | null;
  currencySummary?: string | null;
  onFormChange: (data: InvoiceFormData) => void;
  onLineItemsChange: (items: LineItemForm[]) => void;
}

export function ExtractionEditor({
  formData,
  lineItems,
  classification,
  currencySummary,
  onFormChange,
  onLineItemsChange,
}: ExtractionEditorProps) {
  const trackedCount = lineItems.filter((item) => {
    const value = Number(item.amount.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(value) && value > 0;
  }).length;

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border p-4"
        style={{
          background: "var(--color-bg-elevated)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Extraherad data
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Justera fälten innan du sparar om något blev fel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{trackedCount} spårade rader</Badge>
            {classification ? <Badge variant="primary">{classification}</Badge> : null}
          </div>
        </div>
        {currencySummary ? (
          <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {currencySummary}
          </p>
        ) : null}
      </div>

      <section className="space-y-4">
        <div>
          <h4
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Fakturainformation
          </h4>
        </div>
        <InvoiceForm data={formData} onChange={onFormChange} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h4
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Fakturarader
          </h4>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Nollrader visas grått som inkluderade poster
          </p>
        </div>
        <LineItemsEditor items={lineItems} onChange={onLineItemsChange} />
      </section>
    </div>
  );
}
