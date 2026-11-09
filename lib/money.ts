// Money is stored as an integer in the currency's smallest unit (USD/EUR → cents, JPY → yen).
// Display and form input go through these helpers only.

export const DEFAULT_CURRENCY = "USD";

/** Common currencies shown first in pickers; any ISO 4217 code is accepted. */
export const POPULAR_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "TRY",
  "INR",
  "CAD",
  "AUD",
  "SGD",
  "JPY",
  "KRW",
  "CNY",
  "BRL",
  "MXN",
  "ZAR",
  "NGN",
  "KZT",
  "UZS",
  "RUB",
] as const;

const digitsCache = new Map<string, number>();

/** Number of minor-unit digits (USD 2, JPY 0, KWD 3). */
export function currencyDigits(currency: string): number {
  const code = currency.toUpperCase();
  let digits = digitsCache.get(code);
  if (digits === undefined) {
    try {
      digits =
        new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
          .maximumFractionDigits ?? 2;
    } catch {
      digits = 2;
    }
    digitsCache.set(code, digits);
  }
  return digits;
}

export function isValidCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return /^[A-Z]{3}$/.test(code);
  } catch {
    return false;
  }
}

/** 899, "USD" → "$8.99"; 1500, "JPY" → "¥1,500". Signed amounts keep their sign. */
export function formatMoney(minor: number, currency: string = DEFAULT_CURRENCY): string {
  const code = currency.toUpperCase();
  const digits = currencyDigits(code);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
}

/** Minor units → number for a form input (899 → 8.99). */
export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** currencyDigits(currency);
}

/** Form input → minor units (8.99 → 899). Rounds to the currency's precision. */
export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** currencyDigits(currency));
}

/** <input step> for prices in this currency (0.01 for USD, 1 for JPY). */
export function priceStep(currency: string): number {
  return 1 / 10 ** currencyDigits(currency);
}
