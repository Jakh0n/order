// The customer's last order per store — only in this browser (localStorage), for "Track your order".

export interface LastOrder {
  id: string;
  number: number;
  /** ms timestamp */
  at: number;
}

/** Shown on the store page for this long after ordering */
export const LAST_ORDER_TTL = 7 * 24 * 60 * 60 * 1000;

const key = (slug: string) => `order-last:${slug}`;

export function saveLastOrder(slug: string, order: Omit<LastOrder, "at">) {
  try {
    localStorage.setItem(key(slug), JSON.stringify({ ...order, at: Date.now() }));
  } catch {
    // localStorage may be blocked — not important
  }
}

/** Raw JSON string of a recent (within TTL) order — a stable snapshot for useSyncExternalStore */
export function readLastOrderRaw(slug: string): string | null {
  try {
    const raw = localStorage.getItem(key(slug));
    const order = parseLastOrder(raw);
    return order && Date.now() - order.at <= LAST_ORDER_TTL ? raw : null;
  } catch {
    return null;
  }
}

export function parseLastOrder(raw: string | null): LastOrder | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<LastOrder>;
    if (typeof value.id !== "string" || typeof value.number !== "number") return null;
    if (typeof value.at !== "number") return null;
    return value as LastOrder;
  } catch {
    return null;
  }
}
