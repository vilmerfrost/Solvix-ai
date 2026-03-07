"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SpendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SpendPage] Client error:", error.message, error.stack);
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto py-12">
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Kunde inte ladda utgiftsöversikten
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          {error.message || "Ett oväntat fel uppstod."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--color-accent)", color: "white" }}
          >
            Försök igen
          </button>
          <Link
            href="/price-monitor"
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          >
            Tillbaka till översikt
          </Link>
        </div>
      </div>
    </div>
  );
}
