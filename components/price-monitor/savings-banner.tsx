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
      className={`rounded-2xl p-8 mb-8 ${
        hasSavings 
          ? "bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 border border-pink-100" 
          : "bg-gray-50 border border-gray-200"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-pink-600 text-sm font-medium uppercase tracking-wide">
            {t("identified")}
          </p>
          <p className="text-4xl md:text-5xl font-bold text-gray-900 mt-2">
            {formatSEK(totalSavings)}
          </p>
          <p className="text-gray-500 mt-1">
            {hasSavings ? t("sinceStart") : t("noSavingsYet")}
          </p>
        </div>
        
        {hasSavings && (
          <div className="text-left md:text-right space-y-2 md:space-y-3 text-sm text-gray-600">
            <div className="flex items-center md:justify-end gap-3 font-medium">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              <span>{t("priceAlerts")}: {formatSEK(priceAlertSavings)}</span>
            </div>
            <div className="flex items-center md:justify-end gap-3 font-medium">
              <FileWarning className="w-4 h-4 text-pink-500" />
              <span>{t("deviations")}: {formatSEK(deviationSavings)}</span>
            </div>
            <div className="flex items-center md:justify-end gap-3 font-medium">
              <ArrowLeftRight className="w-4 h-4 text-pink-500" />
              <span>{t("cheaperSupplier")}: {formatSEK(comparisonSavings)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
