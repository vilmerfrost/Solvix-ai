"use client";

import { X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/index";
import type { ProductGroup } from "@/lib/price-monitor-api";

interface ProductGroupCardProps {
  group: ProductGroup;
  onAssign?: (group: ProductGroup) => void;
  onRemoveProduct?: (productId: string) => void;
}

export function ProductGroupCard({
  group,
  onAssign,
  onRemoveProduct,
}: ProductGroupCardProps) {
  return (
    <Card>
      <CardHeader className="mb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{group.name}</CardTitle>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {group.products.length} produkter
            </p>
          </div>
          {group.spend_categories?.name ? (
            <Badge variant="primary">{group.spend_categories.name}</Badge>
          ) : (
            <Badge>Okategoriserat</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {group.products.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Inga produkter tillagda ännu.
          </p>
        ) : (
          group.products.map((product) => (
            <div
              key={product.id}
              className="rounded-lg border px-3 py-2 text-sm flex items-start justify-between gap-3"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
              }}
            >
              <div>
                <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {product.name}
                </p>
                <p style={{ color: "var(--color-text-muted)" }}>
                  {product.suppliers.name}
                  {product.unit ? ` · ${product.unit}` : ""}
                </p>
              </div>
              {onRemoveProduct && (
                <button
                  type="button"
                  onClick={() => onRemoveProduct(product.id)}
                  className="mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                  aria-label={`Ta bort ${product.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}

        {onAssign && (
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={() => onAssign(group)}>
              Lägg till produkter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
