export const PRICE_MONITOR_BASE_CURRENCY = "SEK" as const;

export const SUPPORTED_PRICE_MONITOR_CURRENCIES = [
  "SEK",
  "USD",
  "EUR",
  "NOK",
  "DKK",
] as const;

export type SupportedPriceMonitorCurrency =
  (typeof SUPPORTED_PRICE_MONITOR_CURRENCIES)[number];

export type PriceMonitorExchangeRates = Record<
  SupportedPriceMonitorCurrency,
  number
>;

export type PriceMonitorManualExchangeRates = Partial<
  Record<Exclude<SupportedPriceMonitorCurrency, "SEK">, number>
>;

export interface PriceMonitorFxSnapshot {
  currency: SupportedPriceMonitorCurrency;
  rate_to_sek: number | null;
  source: string | null;
  updated_at: string | null;
  manual_override: boolean;
}

export interface PriceMonitorFxSettings {
  exchange_rates: PriceMonitorExchangeRates;
  manual_exchange_rates: PriceMonitorManualExchangeRates;
  exchange_rates_source: string | null;
  exchange_rates_updated_at: string | null;
}

export function getDefaultExchangeRates(): PriceMonitorExchangeRates {
  return {
    SEK: 1,
    USD: 0,
    EUR: 0,
    NOK: 0,
    DKK: 0,
  };
}

export function normalizeCurrency(
  value: string | null | undefined
): SupportedPriceMonitorCurrency {
  const upper = value?.toUpperCase();
  if (
    upper &&
    SUPPORTED_PRICE_MONITOR_CURRENCIES.includes(
      upper as SupportedPriceMonitorCurrency
    )
  ) {
    return upper as SupportedPriceMonitorCurrency;
  }
  return PRICE_MONITOR_BASE_CURRENCY;
}

export function normalizeExchangeRates(
  value: Record<string, unknown> | null | undefined
): PriceMonitorExchangeRates {
  const defaults = getDefaultExchangeRates();

  for (const currency of SUPPORTED_PRICE_MONITOR_CURRENCIES) {
    if (currency === PRICE_MONITOR_BASE_CURRENCY) continue;
    const raw = value?.[currency];
    const parsed =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;

    if (Number.isFinite(parsed) && parsed > 0) {
      defaults[currency] = parsed;
    }
  }

  return defaults;
}

export function normalizeManualExchangeRates(
  value: Record<string, unknown> | null | undefined
): PriceMonitorManualExchangeRates {
  const result: PriceMonitorManualExchangeRates = {};

  for (const currency of SUPPORTED_PRICE_MONITOR_CURRENCIES) {
    if (currency === PRICE_MONITOR_BASE_CURRENCY) continue;

    const raw = value?.[currency];
    const parsed =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;

    if (Number.isFinite(parsed) && parsed > 0) {
      result[currency] = parsed;
    }
  }

  return result;
}

export function getEffectiveExchangeRate(
  currency: string | null | undefined,
  settings: PriceMonitorFxSettings
): number | null {
  const normalized = normalizeCurrency(currency);

  if (normalized === PRICE_MONITOR_BASE_CURRENCY) {
    return 1;
  }

  const manualRate = settings.manual_exchange_rates[normalized];
  if (typeof manualRate === "number" && Number.isFinite(manualRate) && manualRate > 0) {
    return manualRate;
  }

  const rate = settings.exchange_rates[normalized];
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function getFxSnapshot(
  currency: string | null | undefined,
  settings: PriceMonitorFxSettings
): PriceMonitorFxSnapshot {
  const normalized = normalizeCurrency(currency);
  const manualRate =
    normalized === PRICE_MONITOR_BASE_CURRENCY
      ? undefined
      : settings.manual_exchange_rates[normalized];
  const rate =
    normalized === PRICE_MONITOR_BASE_CURRENCY
      ? 1
      : getEffectiveExchangeRate(normalized, settings);

  return {
    currency: normalized,
    rate_to_sek: rate,
    source:
      normalized === PRICE_MONITOR_BASE_CURRENCY
        ? "base_currency"
        : manualRate
          ? "manual_override"
          : settings.exchange_rates_source,
    updated_at: settings.exchange_rates_updated_at,
    manual_override: typeof manualRate === "number" && manualRate > 0,
  };
}

export function convertAmountToSek(
  amount: number | null | undefined,
  currency: string | null | undefined,
  settings: PriceMonitorFxSettings
): number | null {
  if (amount == null) return null;

  const rate = getEffectiveExchangeRate(currency, settings);
  if (!rate) return null;

  return roundCurrency(amount * rate);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
