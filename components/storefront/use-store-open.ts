"use client";

import { useSyncExternalStore } from "react";

import type { StorefrontStore } from "@/lib/menu-types";
import { isStoreOpenNow } from "@/lib/store-hours";

type Hours = Pick<StorefrontStore, "isOpen" | "openTime" | "closeTime" | "timeZone">;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

/** Open right now (in the store's time zone)? null during SSR/hydration — time is only read in the browser. */
export function useStoreOpen(store: Hours): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => isStoreOpenNow(store),
    () => null,
  );
}
