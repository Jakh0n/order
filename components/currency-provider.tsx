"use client";

import { createContext, useCallback, useContext } from "react";

import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";

const CurrencyContext = createContext<string>(DEFAULT_CURRENCY);

/** The store's currency for client components below (storefront, checkout, admin). */
export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: React.ReactNode;
}) {
  return <CurrencyContext value={currency}>{children}</CurrencyContext>;
}

export function useCurrency(): string {
  return useContext(CurrencyContext);
}

/** (minor) => "$8.99" in the current store's currency */
export function useFormatMoney() {
  const currency = useCurrency();
  return useCallback((minor: number) => formatMoney(minor, currency), [currency]);
}
