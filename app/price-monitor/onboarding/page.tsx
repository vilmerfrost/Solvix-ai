"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Progress, useToast } from "@/components/ui/index";

export default function PriceMonitorOnboardingPage() {
  const t = useTranslations("fortnoxOnboarding");
  const router = useRouter();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [syncFromDate, setSyncFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!syncing) return;

    const interval = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 600);

    return () => window.clearInterval(interval);
  }, [syncing]);

  async function startSync() {
    setSyncing(true);
    setProgress(25);

    try {
      const saveResponse = await fetch("/api/fortnox/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSync: true, syncFromDate }),
      });
      if (!saveResponse.ok) {
        throw new Error("Could not save Fortnox settings.");
      }

      const syncResponse = await fetch("/api/fortnox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncFromDate }),
      });
      const body = await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(body?.error || "Could not run the first sync.");
      }

      setProgress(100);
      setStep(4);
    } catch (error) {
      addToast({
        type: "error",
        title: t("step3Title"),
        description: error instanceof Error ? error.message : undefined,
      });
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
      <Card className="w-full" variant="elevated">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {t("welcome")}
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                {t("welcomeDescription")}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {t("step1Title")}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                {t("step1Desc")}
              </p>
            </div>

            <Button variant="primary" onClick={() => (window.location.href = "/api/fortnox/connect")}>
              {t("step1Title")}
            </Button>

            <Button variant="secondary" onClick={() => setStep(2)}>
              {t("continue")}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {t("step2Title")}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                {t("step2Desc")}
              </p>
            </div>

            <input
              type="date"
              value={syncFromDate}
              onChange={(event) => setSyncFromDate(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />

            <Button variant="primary" onClick={() => setStep(3)}>
              {t("continue")}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {t("step3Title")}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                {t("step3Desc")}
              </p>
            </div>

            <Progress value={progress} showLabel />

            <Button variant="primary" loading={syncing} onClick={startSync}>
              {t("startSync")}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t("done")}
            </p>

            <Button variant="primary" onClick={() => router.push("/price-monitor")}>
              {t("goToDashboard")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
