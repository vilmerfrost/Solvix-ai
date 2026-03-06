"use client";

import { Trash2, Plus } from "lucide-react";
import { ConfidenceDot } from "./confidence-dot";

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

const inputBase =
  "w-full rounded-md border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1";

const inputStyle = {
  background: "var(--color-bg)",
  borderColor: "var(--color-border)",
  color: "var(--color-text-primary)",
};

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
                <tr
                  key={idx}
                  style={{ borderBottom: idx === items.length - 1 ? "none" : "1px solid var(--color-border)" }}
                >
                  {/* Confidence dot */}
                  <td className="px-2 py-2 w-8">
                    <ConfidenceDot value={item.match_confidence} />
                  </td>

                  {/* Description */}
                  <td className="px-2 py-2 min-w-[180px]">
                    <input
                      className={inputBase}
                      style={inputStyle}
                      value={item.description}
                      onChange={(e) => update(idx, "description", e.target.value)}
                      placeholder="Beskrivning…"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="px-2 py-2 w-20">
                    <input
                      className={inputBase}
                      style={inputStyle}
                      value={item.quantity}
                      onChange={(e) => update(idx, "quantity", e.target.value)}
                      placeholder="0"
                    />
                  </td>

                  {/* Unit */}
                  <td className="px-2 py-2 w-20">
                    <input
                      className={inputBase}
                      style={inputStyle}
                      value={item.unit}
                      onChange={(e) => update(idx, "unit", e.target.value)}
                      placeholder="st"
                    />
                  </td>

                  {/* Unit price */}
                  <td className="px-2 py-2 w-28">
                    <input
                      className={inputBase}
                      style={inputStyle}
                      value={item.unit_price}
                      onChange={(e) => update(idx, "unit_price", e.target.value)}
                      placeholder="0,00"
                    />
                  </td>

                  {/* Amount */}
                  <td className="px-2 py-2 w-28">
                    <input
                      className={inputBase}
                      style={inputStyle}
                      value={item.amount}
                      onChange={(e) => update(idx, "amount", e.target.value)}
                      placeholder="0,00"
                    />
                  </td>

                  {/* VAT rate */}
                  <td className="px-2 py-2 w-20">
                    <input
                      className={inputBase}
                      style={inputStyle}
                      value={item.vat_rate}
                      onChange={(e) => update(idx, "vat_rate", e.target.value)}
                      placeholder="25"
                    />
                  </td>

                  {/* Matched product */}
                  <td className="px-2 py-2 w-36">
                    {item.matched_product ? (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full"
                        style={{
                          background: "var(--color-accent-muted)",
                          color: "var(--color-accent)",
                        }}
                        title={item.matched_product}
                      >
                        {item.matched_product}
                      </span>
                    ) : (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--color-bg-secondary)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {item.is_new_product ? "Ny produkt" : "Omatchad"}
                      </span>
                    )}
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-2 w-8">
                    <button
                      onClick={() => remove(idx)}
                      className="p-1 rounded hover:bg-red-50 transition-colors"
                      style={{ color: "var(--color-text-muted)" }}
                      title="Ta bort rad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
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
