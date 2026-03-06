"use client";

import { Badge } from "@/components/ui/index";
import type { SpendCategory } from "@/lib/price-monitor-api";

interface CategoryTagProps {
  category: SpendCategory;
  groupCount?: number;
}

export function CategoryTag({ category, groupCount = 0 }: CategoryTagProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: category.color || "var(--color-accent)" }}
          />
          <div>
            <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
              {category.name}
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {groupCount} produktgrupper
            </p>
          </div>
        </div>
        <Badge variant="default">{category.color || "Standard"}</Badge>
      </div>
    </div>
  );
}
