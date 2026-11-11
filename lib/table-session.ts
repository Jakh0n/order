"use client";

import { useSyncExternalStore } from "react";

// Table QR (/{slug}?t=5): the table number is remembered per store for a few hours,
// so it survives going to checkout and back — but a customer ordering from home
// the next day isn't stuck "at table 5".

const KEY = (slug: string) => `order-table:${slug}`;
const TTL_MS = 4 * 60 * 60_000;
const EVENT = "order-table-change";

export { TABLE_PARAM } from "./table-session-link";

function read(slug: string): number | null {
  try {
    const raw = localStorage.getItem(KEY(slug));
    if (!raw) return null;
    const { table, at } = JSON.parse(raw) as { table: number; at: number };
    if (!Number.isInteger(table) || table < 1 || Date.now() - at > TTL_MS) return null;
    return table;
  } catch {
    return null;
  }
}

export function setTable(slug: string, table: number | null) {
  try {
    if (table) localStorage.setItem(KEY(slug), JSON.stringify({ table, at: Date.now() }));
    else localStorage.removeItem(KEY(slug));
  } catch {
    // Storage blocked — the table just isn't remembered
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Current table for this store (null on the server and when not at a table) */
export function useTable(slug: string): number | null {
  return useSyncExternalStore(
    subscribe,
    () => read(slug),
    () => null,
  );
}
