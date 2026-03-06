"use client";

import { Sparkles } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/index";
import {
  formatSEK,
  type AiInsight,
} from "@/lib/price-monitor-api";

interface AiInsightsProps {
  insights: AiInsight[];
}

function impactVariant(impact: AiInsight["impact"]) {
  switch (impact) {
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "success";
  }
}

function impactLabel(impact: AiInsight["impact"]) {
  switch (impact) {
    case "high":
      return "Hög";
    case "medium":
      return "Medel";
    default:
      return "Låg";
  }
}

export function AiInsights({ insights }: AiInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
        <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          AI-insikter
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {insights.map((insight, index) => (
          <Card key={`${insight.title}-${index}`}>
            <CardHeader className="mb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-base">{insight.title}</CardTitle>
                <Badge variant={impactVariant(insight.impact)}>
                  {impactLabel(insight.impact)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {insight.insight}
              </p>
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Rekommenderad åtgärd
                </p>
                <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  {insight.action}
                </p>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Beräknad besparing:{" "}
                <span style={{ color: "var(--color-text-primary)" }}>
                  {insight.estimated_savings_sek != null
                    ? formatSEK(insight.estimated_savings_sek)
                    : "Saknas"}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
