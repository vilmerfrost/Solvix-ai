"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/ui/index";
import type { AiGroupSuggestion } from "@/lib/price-monitor-api";

interface AiSuggestionsProps {
  suggestions: AiGroupSuggestion[];
  onAccept: (suggestion: AiGroupSuggestion) => void;
  onIgnore: (suggestion: AiGroupSuggestion) => void;
}

export function AiSuggestions({
  suggestions,
  onAccept,
  onIgnore,
}: AiSuggestionsProps) {
  const t = useTranslations("aiSuggestions");
  const visibleSuggestions = useMemo(() => {
    const safe = Array.isArray(suggestions) ? suggestions : [];
    return safe.filter(
      (suggestion) =>
        Array.isArray(suggestion?.products) && suggestion.products.length > 1
    );
  }, [suggestions]);

  if (visibleSuggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      {visibleSuggestions.map((suggestion) => (
        <Card
          key={`${suggestion.group_name}-${(suggestion?.products ?? []).join("|")}`}
          padding="sm"
        >
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--color-accent-muted)", color: "var(--color-accent)" }}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t("title")}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {t("question")}
                  </p>
                </div>
              </div>
              <Badge variant="primary">
                {t("confidence", { value: Math.round(suggestion.confidence * 100) })}
              </Badge>
            </div>

            <div className="space-y-2">
              {(Array.isArray(suggestion?.products) ? suggestion.products : []).map((product) => (
                <div
                  key={product}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {product}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => onAccept(suggestion)}>
                {t("group")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onIgnore(suggestion)}>
                {t("ignore")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
