"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/index";
import {
  formatDate,
  formatPercent,
  formatSEK,
  type SupplierComparisonRow,
} from "@/lib/price-monitor-api";

interface ComparisonTableProps {
  rows: SupplierComparisonRow[];
}

export function ComparisonTable({ rows }: ComparisonTableProps) {
  const groups = rows.reduce<Record<string, SupplierComparisonRow[]>>((acc, row) => {
    const key = `${row.group_id}:${row.group_name}`;
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([key, groupRows]) => {
        const sorted = [...groupRows].sort((a, b) => a.unit_price - b.unit_price);
        const groupName = sorted[0]?.group_name ?? key;
        const cheapest = sorted[0]?.unit_price ?? 0;
        const mostExpensive = sorted[sorted.length - 1]?.unit_price ?? cheapest;
        const potentialSavings = Math.max(mostExpensive - cheapest, 0);

        return (
          <Card key={key}>
            <CardHeader className="mb-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">{groupName}</CardTitle>
                  <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {sorted[0]?.product_name}
                    {sorted[0]?.unit ? ` · ${sorted[0].unit}` : ""} · {sorted.length} leverantörer
                  </p>
                </div>
                <Badge variant="info">
                  Möjlig besparing {formatSEK(potentialSavings)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--color-text-muted)" }}>
                    <th className="px-3 py-3 text-left font-medium">Leverantör</th>
                    <th className="px-3 py-3 text-right font-medium">Enhetspris</th>
                    <th className="px-3 py-3 text-left font-medium">Senast köpt</th>
                    <th className="px-3 py-3 text-right font-medium">Premie</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, index) => {
                    const isCheapest = index === 0;
                    return (
                      <tr
                        key={`${row.group_id}-${row.supplier_id}-${row.product_id}`}
                        style={{
                          borderTop:
                            index === 0 ? "1px solid var(--color-border)" : "1px solid var(--color-border)",
                        }}
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                            {row.supplier_name}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right" style={{ color: "var(--color-text-primary)" }}>
                          {formatSEK(row.unit_price)}
                        </td>
                        <td className="px-3 py-3" style={{ color: "var(--color-text-secondary)" }}>
                          {formatDate(row.invoice_date)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {isCheapest ? (
                            <Badge variant="success">Billigast</Badge>
                          ) : (
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  row.premium_percent >= 15
                                    ? "var(--color-error)"
                                    : "var(--color-warning)",
                              }}
                            >
                              {formatPercent(row.premium_percent)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
