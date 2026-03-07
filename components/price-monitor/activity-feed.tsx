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
          let iconColor = "text-blue-500";
          let bgColor = "bg-blue-50";

          if (activity.type === "alert") {
            Icon = TrendingUp;
            iconColor = "text-red-500";
            bgColor = "bg-red-50";
          } else if (activity.type === "deviation") {
            Icon = AlertTriangle;
            iconColor = "text-amber-500";
            bgColor = "bg-amber-50";
          }

          return (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: "var(--color-border)" }}>
              <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor} ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{activity.text}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: dateLocale })}
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
