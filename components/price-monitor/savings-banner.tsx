"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, FileWarning, ArrowLeftRight } from "lucide-react";
import { formatSEK } from "@/lib/price-monitor-api";

interface SavingsBannerProps {
  totalSavings: number;
  priceAlertSavings: number;
  deviationSavings: number;
  comparisonSavings: number;
}

export function SavingsBanner({
  totalSavings,
  priceAlertSavings,
  deviationSavings,
  comparisonSavings,
}: SavingsBannerProps) {
  const t = useTranslations("savings");

  const hasSavings = totalSavings > 0 || priceAlertSavings > 0 || deviationSavings > 0 || comparisonSavings > 0;

  return (
    <div 
      className={`rounded-2xl p-8 mb-8 text-white ${
        hasSavings 
          ? "bg-gradient-to-r from-pink-600 to-fuchsia-600" 
          : "bg-zinc-800 opacity-90"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-pink-100 text-sm font-medium uppercase tracking-wide opacity-90">
            {t("identified")}
          </p>
          <p className="text-4xl md:text-5xl font-bold mt-2">
            {formatSEK(totalSavings)}
          </p>
          <p className="text-pink-100 mt-1 opacity-90">
            {hasSavings ? t("sinceStart") : t("noSavingsYet")}
          </p>
        </div>
        
        {hasSavings && (
          <div className="text-left md:text-right space-y-2 md:space-y-3">
            <div className="flex items-center md:justify-end gap-3 text-sm font-medium">
              <TrendingUp className="w-4 h-4 opacity-80" />
              <span>{t("priceAlerts")}: {formatSEK(priceAlertSavings)}</span>
            </div>
            <div className="flex items-center md:justify-end gap-3 text-sm font-medium">
              <FileWarning className="w-4 h-4 opacity-80" />
              <span>{t("deviations")}: {formatSEK(deviationSavings)}</span>
            </div>
            <div className="flex items-center md:justify-end gap-3 text-sm font-medium">
              <ArrowLeftRight className="w-4 h-4 opacity-80" />
              <span>{t("cheaperSupplier")}: {formatSEK(comparisonSavings)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
