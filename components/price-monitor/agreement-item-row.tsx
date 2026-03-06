"use client";

import { Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui/index";
import type { ProductGroup, SpendCategory } from "@/lib/price-monitor-api";

export type AgreementItemMatchType =
  | "product_group"
  | "category"
  | "description";

export interface AgreementItemDraft {
  tempId: string;
  id?: string;
  match_type: AgreementItemMatchType;
  product_group_id: string;
  category_id: string;
  description: string;
  agreed_price: string;
  discount_percent: string;
  max_price: string;
  unit: string;
}

interface AgreementItemRowProps {
  item: AgreementItemDraft;
  productGroups: ProductGroup[];
  categories: SpendCategory[];
  onChange: (item: AgreementItemDraft) => void;
  onRemove: () => void;
}

const MATCH_OPTIONS: Array<{
  value: AgreementItemMatchType;
  label: string;
}> = [
  { value: "product_group", label: "Produktgrupp" },
  { value: "category", label: "Kategori" },
  { value: "description", label: "Fri text" },
];

export function createAgreementItemDraft(): AgreementItemDraft {
  return {
    tempId: `agreement-item-${Math.random().toString(36).slice(2, 9)}`,
    match_type: "product_group",
    product_group_id: "",
    category_id: "",
    description: "",
    agreed_price: "",
    discount_percent: "",
    max_price: "",
    unit: "",
  };
}

export function AgreementItemRow({
  item,
  productGroups,
  categories,
  onChange,
  onRemove,
}: AgreementItemRowProps) {
  function setField<K extends keyof AgreementItemDraft>(
    key: K,
    value: AgreementItemDraft[K]
  ) {
    onChange({ ...item, [key]: value });
  }

  function changeMatchType(nextType: AgreementItemMatchType) {
    onChange({
      ...item,
      match_type: nextType,
      product_group_id: nextType === "product_group" ? item.product_group_id : "",
      category_id: nextType === "category" ? item.category_id : "",
      description: nextType === "description" ? item.description : "",
    });
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "var(--color-bg)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Avtalsrad
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Välj en typ av matchning och fyll sedan i pris eller rabatt.
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-2 transition-colors hover:bg-black/5"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Ta bort avtalsrad"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {MATCH_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => changeMatchType(option.value)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
            style={{
              background:
                item.match_type === option.value
                  ? "var(--color-accent-muted)"
                  : "var(--color-bg-secondary)",
              color:
                item.match_type === option.value
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
              border: `1px solid ${
                item.match_type === option.value
                  ? "var(--color-accent)"
                  : "var(--color-border)"
              }`,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {item.match_type === "product_group" ? (
          <Select
            label="Produktgrupp"
            value={item.product_group_id}
            onChange={(e) => setField("product_group_id", e.target.value)}
            options={[
              { value: "", label: "Välj produktgrupp" },
              ...productGroups.map((group) => ({
                value: group.id,
                label: group.name,
              })),
            ]}
          />
        ) : null}

        {item.match_type === "category" ? (
          <Select
            label="Kategori"
            value={item.category_id}
            onChange={(e) => setField("category_id", e.target.value)}
            options={[
              { value: "", label: "Välj kategori" },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
        ) : null}

        {item.match_type === "description" ? (
          <Input
            label="Beskrivning"
            value={item.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Exempel: Kopieringspapper A4"
          />
        ) : null}

        <Input
          label="Avtalat pris (kr)"
          type="number"
          min="0"
          step="0.01"
          value={item.agreed_price}
          onChange={(e) => setField("agreed_price", e.target.value)}
          placeholder="79"
        />

        <Input
          label="Maxpris (kr)"
          type="number"
          min="0"
          step="0.01"
          value={item.max_price}
          onChange={(e) => setField("max_price", e.target.value)}
          placeholder="79"
        />

        <Input
          label="Rabatt (%)"
          type="number"
          min="0"
          step="0.01"
          value={item.discount_percent}
          onChange={(e) => setField("discount_percent", e.target.value)}
          placeholder="10"
        />

        <Input
          label="Enhet"
          value={item.unit}
          onChange={(e) => setField("unit", e.target.value)}
          placeholder="pack"
        />
      </div>
    </div>
  );
}
