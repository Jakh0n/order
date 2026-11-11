import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { startOfDayInZone } from "@/lib/store-hours";

// Store analytics. All in SQL (one round trip per block, run in parallel), in the store's time zone.
// Cancelled orders are excluded. Money sums only count orders in the store's current currency
// (a store that switched currency would otherwise add won to dollars).

export const PERIODS = ["today", "7d", "30d", "90d"] as const;
export type Period = (typeof PERIODS)[number];
const DAYS: Record<Period, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 24 * 60 * 60_000;

export function parsePeriod(value: unknown): Period {
  return PERIODS.includes(value as Period) ? (value as Period) : "7d";
}

interface StoreRef {
  id: string;
  currency: string;
  timeZone: string;
}

export interface Analytics {
  period: Period;
  days: number;
  current: Totals;
  previous: Totals;
  /** Local dates "YYYY-MM-DD", every day of the period (zeros filled) */
  byDay: { date: string; orders: number; revenue: number }[];
  /** 0..23, orders placed in that local hour */
  byHour: { hour: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  byType: { type: "PICKUP" | "DELIVERY" | "DINE_IN"; orders: number; revenue: number }[];
  /** Customers (by phone) who ordered in the period, and how many had ordered before it */
  customers: { total: number; returning: number };
}

interface Totals {
  orders: number;
  revenue: number;
}

export async function getAnalytics(store: StoreRef, period: Period): Promise<Analytics> {
  const days = DAYS[period];
  const now = new Date();
  const from = new Date(startOfDayInZone(store.timeZone, now).getTime() - (days - 1) * DAY_MS);
  const prevFrom = new Date(from.getTime() - days * DAY_MS);
  const tz = store.timeZone;

  // Shared filter: this store, not cancelled, in [start, end)
  const where = (start: Date, end: Date) => Prisma.sql`
    o."storeId" = ${store.id}
    AND o."status" <> 'CANCELLED'
    AND o."createdAt" >= ${start} AND o."createdAt" < ${end}`;
  // createdAt is stored as UTC without a zone → local wall time of the store
  const local = Prisma.sql`((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})`;
  const inCurrency = Prisma.sql`o."currency" = ${store.currency}`;

  const [totals, byDay, byHour, topItems, byType, customers] = await Promise.all([
    prisma.$queryRaw<
      { cur_orders: number; cur_rev: bigint; prev_orders: number; prev_rev: bigint }[]
    >`
      SELECT
        count(*) FILTER (WHERE o."createdAt" >= ${from})::int AS cur_orders,
        coalesce(sum(o."total") FILTER (WHERE o."createdAt" >= ${from} AND ${inCurrency}), 0)::bigint AS cur_rev,
        count(*) FILTER (WHERE o."createdAt" < ${from})::int AS prev_orders,
        coalesce(sum(o."total") FILTER (WHERE o."createdAt" < ${from} AND ${inCurrency}), 0)::bigint AS prev_rev
      FROM "Order" o
      WHERE ${where(prevFrom, now)}`,
    prisma.$queryRaw<{ d: string; orders: number; revenue: bigint }[]>`
      SELECT to_char(date_trunc('day', ${local}), 'YYYY-MM-DD') AS d,
        count(*)::int AS orders,
        coalesce(sum(o."total") FILTER (WHERE ${inCurrency}), 0)::bigint AS revenue
      FROM "Order" o
      WHERE ${where(from, now)}
      GROUP BY 1`,
    prisma.$queryRaw<{ h: number; orders: number }[]>`
      SELECT extract(hour FROM ${local})::int AS h, count(*)::int AS orders
      FROM "Order" o
      WHERE ${where(from, now)}
      GROUP BY 1`,
    prisma.$queryRaw<{ name: string; quantity: number; revenue: bigint }[]>`
      SELECT i."name", sum(i."quantity")::int AS quantity,
        coalesce(sum(i."lineTotal") FILTER (WHERE ${inCurrency}), 0)::bigint AS revenue
      FROM "OrderItem" i
      JOIN "Order" o ON o."id" = i."orderId"
      WHERE ${where(from, now)}
      GROUP BY i."name"
      ORDER BY quantity DESC, revenue DESC
      LIMIT 8`,
    prisma.$queryRaw<
      { type: Analytics["byType"][number]["type"]; orders: number; revenue: bigint }[]
    >`
      SELECT o."type"::text AS type, count(*)::int AS orders,
        coalesce(sum(o."total") FILTER (WHERE ${inCurrency}), 0)::bigint AS revenue
      FROM "Order" o
      WHERE ${where(from, now)}
      GROUP BY 1
      ORDER BY orders DESC`,
    prisma.$queryRaw<{ total: number; returning: number }[]>`
      WITH cur AS (
        SELECT DISTINCT o."customerPhone" AS phone
        FROM "Order" o
        WHERE ${where(from, now)} AND o."customerPhone" <> ''
      )
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM "Order" p
          WHERE p."storeId" = ${store.id} AND p."customerPhone" = cur.phone
            AND p."status" <> 'CANCELLED' AND p."createdAt" < ${from}
        ))::int AS returning
      FROM cur`,
  ]);

  // Every day of the period, zeros included (a gap in a bar chart reads as "no data")
  const dayMap = new Map(byDay.map((r) => [r.d, r]));
  const dayKeys = Array.from({ length: days }, (_, i) =>
    localDate(new Date(from.getTime() + i * DAY_MS + 12 * 60 * 60_000), tz),
  );
  const hourMap = new Map(byHour.map((r) => [r.h, r.orders]));
  const t = totals[0];

  return {
    period,
    days,
    current: { orders: t.cur_orders, revenue: Number(t.cur_rev) },
    previous: { orders: t.prev_orders, revenue: Number(t.prev_rev) },
    byDay: dayKeys.map((date) => ({
      date,
      orders: dayMap.get(date)?.orders ?? 0,
      revenue: Number(dayMap.get(date)?.revenue ?? 0),
    })),
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, orders: hourMap.get(hour) ?? 0 })),
    topItems: topItems.map((r) => ({ ...r, revenue: Number(r.revenue) })),
    byType: byType.map((r) => ({ ...r, revenue: Number(r.revenue) })),
    customers: customers[0] ?? { total: 0, returning: 0 },
  };
}

/** "YYYY-MM-DD" of a moment in a time zone */
function localDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
