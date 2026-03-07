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
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
      <button
        type="button"
        onClick={() => setLocale("sv")}
        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          locale === "sv" 
            ? "bg-white text-pink-600 shadow-sm" 
            : "text-gray-500 hover:text-gray-900"
        }`}
        disabled={isPending}
        aria-label={t("swedish")}
      >
        SV
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          locale === "en" 
            ? "bg-white text-pink-600 shadow-sm" 
            : "text-gray-500 hover:text-gray-900"
        }`}
        disabled={isPending}
        aria-label={t("english")}
      >
        EN
      </button>
    </div>
  );
}
