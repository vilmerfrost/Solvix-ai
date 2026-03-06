"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("language");
  const [isPending, startTransition] = useTransition();

  function setLocale(nextLocale: "sv" | "en") {
    startTransition(() => {
      document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }}>
      <button
        type="button"
        onClick={() => setLocale("sv")}
        className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
        style={{
          background: locale === "sv" ? "var(--color-accent-muted)" : "transparent",
          color: locale === "sv" ? "var(--color-accent)" : "var(--color-text-muted)",
        }}
        disabled={isPending}
        aria-label={t("swedish")}
      >
        SV
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
        style={{
          background: locale === "en" ? "var(--color-accent-muted)" : "transparent",
          color: locale === "en" ? "var(--color-accent)" : "var(--color-text-muted)",
        }}
        disabled={isPending}
        aria-label={t("english")}
      >
        EN
      </button>
    </div>
  );
}
