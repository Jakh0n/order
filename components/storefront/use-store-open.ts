"use client";

import { useSyncExternalStore } from "react";

import type { StorefrontStore } from "@/lib/menu-types";
import { isStoreOpenNow } from "@/lib/store-hours";

type Hours = Pick<StorefrontStore, "isOpen" | "openTime" | "closeTime">;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}

/** Hozir ochiqmi (Toshkent vaqti). Server/gidratsiya paytida null — vaqt faqat brauzerda hisoblanadi. */
export function useStoreOpen(store: Hours): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => isStoreOpenNow(store),
    () => null,
  );
}
