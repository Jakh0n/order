import type { OrderStatus, Prisma } from "@prisma/client";

import { ACTIVE_STATUSES } from "@/lib/orders/status";
import { startOfDayInZone } from "@/lib/store-hours";

// Admin order list filters — shared by the orders page and the CSV export, so both show the same orders.

export const ORDER_TABS = ["active", "completed", "cancelled", "all"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const TAB_FILTER: Record<OrderTab, Prisma.OrderWhereInput> = {
  active: { status: { in: ACTIVE_STATUSES as OrderStatus[] } },
  completed: { status: "COMPLETED" },
  cancelled: { status: "CANCELLED" },
  all: {},
};

export function parseTab(value: unknown): OrderTab {
  return ORDER_TABS.includes(value as OrderTab) ? (value as OrderTab) : "active";
}

/** "12" / "#12" → order number; anything else → name or phone */
export function searchFilter(q: string): Prisma.OrderWhereInput | null {
  const query = q.trim().slice(0, 60);
  if (!query) return null;
  const number = /^#?(\d{1,7})$/.exec(query);
  const digits = query.replace(/\D/g, "");
  return {
    OR: [
      ...(number ? [{ number: Number(number[1]) }] : []),
      { customerName: { contains: query, mode: "insensitive" as const } },
      ...(digits.length >= 3 ? [{ customerPhone: { contains: digits } }] : []),
    ],
  };
}

/** "2026-11-10" → that calendar day in the store's time zone */
export function dateFilter(date: string, timeZone: string): Prisma.OrderWhereInput | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const noon = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(noon.getTime())) return null;
  const nextNoon = new Date(noon.getTime() + 24 * 60 * 60 * 1000);
  return {
    createdAt: {
      gte: startOfDayInZone(timeZone, noon),
      lt: startOfDayInZone(timeZone, nextNoon),
    },
  };
}
