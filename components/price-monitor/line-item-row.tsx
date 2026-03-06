"use client";

import { Trash2 } from "lucide-react";
import { ConfidenceDot } from "./confidence-dot";
import type { LineItemForm } from "./line-items-editor";

interface LineItemRowProps {
  item: LineItemForm;
  index: number;
  isLast: boolean;
  onUpdate: (idx: number, field: keyof LineItemForm, value: string) => void;
  onRemove: (idx: number) => void;
}

const inputBase =
  "w-full rounded-md border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-1";

const inputStyle = {
  background: "var(--color-bg)",
  borderColor: "var(--color-border)",
  color: "var(--color-text-primary)",
};

function isZeroAmount(value: string): boolean {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed === 0;
}

export function LineItemRow({
  item,
  index,
  isLast,
  onUpdate,
  onRemove,
}: LineItemRowProps) {
  const zeroAmount = isZeroAmount(item.amount);
  const rowColor = zeroAmount
    ? "var(--color-text-muted)"
    : "var(--color-text-primary)";

  return (
    <tr
      className={zeroAmount ? "text-xs" : undefined}
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--color-border)",
        opacity: zeroAmount ? 0.72 : 1,
      }}
    >
      <td className="px-2 py-2 w-8">
        <ConfidenceDot value={item.match_confidence} />
      </td>
      <td className="px-2 py-2 min-w-[180px]">
        <input
          className={inputBase}
          style={inputStyle}
          value={item.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="Beskrivning…"
        />
      </td>
      <td className="px-2 py-2 w-20">
        <input
          className={inputBase}
          style={inputStyle}
          value={item.quantity}
          onChange={(e) => onUpdate(index, "quantity", e.target.value)}
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2 w-20">
        <input
          className={inputBase}
          style={inputStyle}
          value={item.unit}
          onChange={(e) => onUpdate(index, "unit", e.target.value)}
          placeholder="st"
        />
      </td>
      <td className="px-2 py-2 w-28">
        <input
          className={inputBase}
          style={inputStyle}
          value={item.unit_price}
          onChange={(e) => onUpdate(index, "unit_price", e.target.value)}
          placeholder="0,00"
        />
      </td>
      <td className="px-2 py-2 w-28">
        <input
          className={inputBase}
          style={inputStyle}
          value={item.amount}
          onChange={(e) => onUpdate(index, "amount", e.target.value)}
          placeholder="0,00"
        />
        {zeroAmount && (
          <div className="mt-1 text-[10px]" style={{ color: rowColor }}>
            Inkluderat
          </div>
        )}
      </td>
      <td className="px-2 py-2 w-20">
        <input
          className={inputBase}
          style={inputStyle}
          value={item.vat_rate}
          onChange={(e) => onUpdate(index, "vat_rate", e.target.value)}
          placeholder="25"
        />
      </td>
      <td className="px-2 py-2 w-36">
        {item.matched_product ? (
          <span
            className="inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium"
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
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-muted)",
            }}
          >
            {item.is_new_product ? "Ny produkt" : "Omatchad"}
          </span>
        )}
      </td>
      <td className="px-2 py-2 w-8">
        <button
          onClick={() => onRemove(index)}
          className="rounded p-1 transition-colors hover:bg-red-50"
          style={{ color: "var(--color-text-muted)" }}
          title="Ta bort rad"
          type="button"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}
