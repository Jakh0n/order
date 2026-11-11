import "server-only";

import { POPULAR_CURRENCIES } from "@/lib/money";

// Built on the server only, so the settings form renders the same list on server and client
// (browsers ship different ICU data than Node — e.g. "SLE" vs "SLL").
// Matches the server-side validation (isValidCurrency / isValidTimeZone also run in Node).

/** Popular currencies first, then all ISO 4217 codes; the store's current one is always kept */
export function currencyOptions(current: string): string[] {
  const all =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : [];
  return [...new Set([...POPULAR_CURRENCIES, current, ...all])];
}

/** All IANA time zones; the store's current one is always kept */
export function timeZoneOptions(current: string): string[] {
  const all =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return [...new Set(["UTC", current, ...all])];
}
