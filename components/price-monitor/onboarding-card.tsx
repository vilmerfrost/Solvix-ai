"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/index";

interface OnboardingCardProps {
  onUploadClick: () => void;
}

export function OnboardingCard({ onUploadClick }: OnboardingCardProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  return (
    <div className="rounded-2xl border p-8 mb-8 bg-white" style={{ borderColor: "var(--color-border)", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t("title")}</h2>
      <p className="mb-8" style={{ color: "var(--color-text-muted)" }}>{t("subtitle")}</p>
      
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
            <div>
              <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{t("step1")}</p>
            </div>
          </div>
          <Button variant="primary" onClick={onUploadClick} className="whitespace-nowrap" style={{ backgroundColor: "var(--brand-color)", borderColor: "var(--brand-color)" }}>
            {t("start")}
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">2</div>
            <div>
              <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{t("step2")}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => router.push("/price-monitor/agreements")} className="whitespace-nowrap">
            {t("create")}
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50 opacity-70">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">3</div>
            <div>
              <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{t("step3")}</p>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-500 px-4">
            {t("waiting")}
          </div>
        </div>
      </div>
      
      <div className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        {t("support")}
      </div>
    </div>
  );
}
