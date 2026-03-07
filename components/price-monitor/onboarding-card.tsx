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
    <div className="rounded-2xl border p-8 mb-8" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t("title")}</h2>
      <p className="mb-8" style={{ color: "var(--color-text-muted)" }}>{t("subtitle")}</p>
      
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: "var(--color-accent-muted)", color: "var(--color-accent)" }}>1</div>
            <div>
              <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{t("step1")}</p>
            </div>
          </div>
          <Button variant="primary" onClick={onUploadClick} className="whitespace-nowrap" style={{ backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)" }}>
            {t("start")}
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-muted)" }}>2</div>
            <div>
              <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{t("step2")}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => router.push("/price-monitor/agreements")} className="whitespace-nowrap">
            {t("create")}
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border opacity-70" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-muted)" }}>3</div>
            <div>
              <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{t("step3")}</p>
            </div>
          </div>
          <div className="text-sm font-medium px-4" style={{ color: "var(--color-text-muted)" }}>
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
