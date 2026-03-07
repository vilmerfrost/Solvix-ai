"use client";

import { useTranslations, useLocale } from "next-intl";
import { FileText, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS } from "date-fns/locale";

export type ActivityItem = {
  type: 'invoice' | 'alert' | 'deviation';
  text: string;
  date: string;
};

export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const t = useTranslations("activity");
  const locale = useLocale();
  const dateLocale = locale === "sv" ? sv : enUS;

  if (!activities || activities.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-semibold text-base mb-4" style={{ color: "var(--color-text-primary)" }}>
        {t("title")}
      </h2>
      <div className="space-y-3">
        {activities.map((activity, idx) => {
          let Icon = FileText;
          let inlineIconStyle = { color: "var(--color-accent)" };
          let inlineBgStyle = { background: "var(--color-accent-muted)" };

          if (activity.type === "alert") {
            Icon = TrendingUp;
            inlineIconStyle = { color: "var(--color-error)" };
            inlineBgStyle = { background: "var(--color-error-bg)" };
          } else if (activity.type === "deviation") {
            Icon = AlertTriangle;
            inlineIconStyle = { color: "var(--color-warning)" };
            inlineBgStyle = { background: "var(--color-warning-bg)" };
          }

          const parsedDate = new Date(activity.date);
          const hasValidDate = !Number.isNaN(parsedDate.getTime());

          return (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border)" }}>
              <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={inlineBgStyle}>
                <Icon className="w-4 h-4" style={inlineIconStyle} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{activity.text}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" style={{ color: "var(--color-text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {hasValidDate
                      ? formatDistanceToNow(parsedDate, { addSuffix: true, locale: dateLocale })
                      : activity.date}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
