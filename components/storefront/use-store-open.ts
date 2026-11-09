"use client";

import { useMemo, useSyncExternalStore } from "react";

import type { StorefrontStore } from "@/lib/menu-types";
import { isStoreOpenNow, type TimeSlot, timeSlots } from "@/lib/store-hours";

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

/** Current minute (changes every 30s check) — a stable snapshot for useSyncExternalStore */
const currentMinute = () => Math.floor(Date.now() / 60_000);

/**
 * Times the customer can schedule for (store time zone). Empty during SSR/hydration
 * and when the store is closed manually. Recomputed when the minute changes.
 */
export function useTimeSlots(store: Hours): TimeSlot[] {
  const minute = useSyncExternalStore(subscribe, currentMinute, () => 0);
  const { isOpen, openTime, closeTime, timeZone } = store;
  return useMemo(
    () =>
      minute === 0
        ? []
        : timeSlots({ isOpen, openTime, closeTime, timeZone }, new Date(minute * 60_000)),
    [minute, isOpen, openTime, closeTime, timeZone],
  );
}
