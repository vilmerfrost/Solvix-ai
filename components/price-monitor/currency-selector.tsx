"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  Button,
  Input,
  Select,
} from "@/components/ui/index";
import { getExchangeRate } from "@/lib/price-monitor-api";
import { SUPPORTED_PRICE_MONITOR_CURRENCIES } from "@/lib/price-monitor-currency";

interface CurrencySelectorProps {
  currency: string;
  rate: number;
  rateSource: "auto" | "manual";
  fetchedAt: string | null;
  onCurrencyChange: (currency: string) => void;
  onRateChange: (rate: number, source: "auto" | "manual") => void;
  disabled?: boolean;
}

export function CurrencySelector({
  currency,
  rate,
  rateSource,
  fetchedAt,
  onCurrencyChange,
  onRateChange,
  disabled = false,
}: CurrencySelectorProps) {
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(rate || 1));

  useEffect(() => {
    setRateInput(String(rate || 1));
  }, [rate]);

  useEffect(() => {
    async function loadRate() {
      if (currency === "SEK") {
        onRateChange(1, "auto");
        return;
      }

      setLoadingRate(true);
      try {
        const data = await getExchangeRate(currency);
        onRateChange(data.rate, "auto");
      } finally {
        setLoadingRate(false);
      }
    }

    loadRate();
  }, [currency, onRateChange]);

  const options = SUPPORTED_PRICE_MONITOR_CURRENCIES.map((value) => ({
    value,
    label: value,
  }));

  return (
    <div
      className="space-y-4 rounded-xl border p-4"
      style={{
        background: "var(--color-bg-elevated)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Valuta"
          options={options}
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          disabled={disabled}
        />

        <div className="space-y-2">
          <Input
            label="Växelkurs"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            onBlur={() => {
              const parsed = Number(rateInput.replace(",", "."));
              if (Number.isFinite(parsed) && parsed > 0) {
                onRateChange(parsed, "manual");
              } else {
                setRateInput(String(rate || 1));
              }
            }}
            disabled={disabled || currency === "SEK"}
          />
          <div className="flex items-center justify-between gap-2 text-xs">
            <span style={{ color: "var(--color-text-muted)" }}>
              {currency === "SEK"
                ? "1 SEK = 1,00 SEK"
                : `1 ${currency} = ${rate.toFixed(3).replace(".", ",")} SEK`}
            </span>
            {currency !== "SEK" && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                loading={loadingRate}
                disabled={disabled}
                icon={<RefreshCcw className="w-3 h-3" />}
                onClick={async () => {
                  const data = await getExchangeRate(currency);
                  onRateChange(data.rate, "auto");
                }}
              >
                Uppdatera
              </Button>
            )}
          </div>
          {currency !== "SEK" && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Källa: {rateSource === "manual" ? "Manuell" : "Automatisk"}
              {fetchedAt ? ` · ${new Date(fetchedAt).toLocaleString("sv-SE")}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
