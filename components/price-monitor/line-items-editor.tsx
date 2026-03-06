"use client";

import { Plus } from "lucide-react";
import { LineItemRow } from "./line-item-row";

export interface LineItemForm {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  amount: string;
  vat_rate: string;
  matched_product: string | null;
  match_confidence: number;
  is_new_product: boolean;
  product_id: string | null;
}

export function emptyLineItem(): LineItemForm {
  return {
    description: "",
    quantity: "",
    unit: "",
    unit_price: "",
    amount: "",
    vat_rate: "",
    matched_product: null,
    match_confidence: 0,
    is_new_product: true,
    product_id: null,
  };
}

interface LineItemsEditorProps {
  items: LineItemForm[];
  onChange: (items: LineItemForm[]) => void;
}

const HEADERS = [
  { label: "Kf.", width: "w-8" },
  { label: "Beskrivning", width: "min-w-[180px]" },
  { label: "Antal", width: "w-20" },
  { label: "Enhet", width: "w-20" },
  { label: "Á-pris", width: "w-28" },
  { label: "Belopp", width: "w-28" },
  { label: "Moms%", width: "w-20" },
  { label: "Produkt", width: "w-36" },
  { label: "", width: "w-8" },
];

export function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
  function update(idx: number, field: keyof LineItemForm, value: string) {
    const next = items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    );
    // Auto-calculate amount from quantity × unit_price
    if (field === "quantity" || field === "unit_price") {
      const item = next[idx];
      const q = parseFloat(item.quantity.replace(",", "."));
      const p = parseFloat(item.unit_price.replace(",", "."));
      if (!isNaN(q) && !isNaN(p)) {
        next[idx] = { ...next[idx], amount: (q * p).toFixed(2).replace(".", ",") };
      }
    }
    onChange(next);
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function addRow() {
    onChange([...items, emptyLineItem()]);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
        <table
          className="w-full text-sm"
          style={{ background: "var(--color-bg-elevated)" }}
        >
          <thead style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)" }}>
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h.label}
                  className={`px-2 py-2.5 text-left text-xs font-medium whitespace-nowrap ${h.width}`}
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Inga rader — klicka &ldquo;Lägg till rad&rdquo; nedan
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <LineItemRow
                  key={idx}
                  item={item}
                  index={idx}
                  isLast={idx === items.length - 1}
                  onUpdate={update}
                  onRemove={remove}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        onClick={addRow}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: "var(--color-bg-secondary)",
          color: "var(--color-accent)",
          border: "1px dashed var(--color-accent)",
        }}
      >
        <Plus className="w-4 h-4" />
        Lägg till rad
      </button>
    </div>
  );
}
