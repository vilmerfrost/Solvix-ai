"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatPercent, type Alert } from "@/lib/price-monitor-api";

interface AlertBannerProps {
  alerts: Alert[];
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const newAlerts = alerts.filter(
    (alert) => alert.status === "new" && alert.change_percent > 0
  );

  if (newAlerts.length === 0) return null;

  const preview = newAlerts
    .slice(0, 3)
    .map((alert) => `${alert.product_name} ${formatPercent(alert.change_percent)}`)
    .join(", ");

  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
        background: "#fff7ed",
        borderColor: "#fdba74",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: "#ea580c" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#9a3412" }}>
              {newAlerts.length} prisökningar upptäckta!
            </p>
            <p className="text-sm" style={{ color: "#c2410c" }}>
              {preview}
              {newAlerts.length > 3 ? ", ..." : ""}
            </p>
          </div>
        </div>
        <Link
          href="/price-monitor/alerts"
          className="text-sm font-medium"
          style={{ color: "#9a3412" }}
        >
          Visa alla varningar →
        </Link>
      </div>
    </div>
  );
}
