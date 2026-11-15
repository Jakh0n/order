import "server-only";

import { Prisma } from "@prisma/client";

import { LAPSED_DAYS } from "@/lib/customers/data";
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
  /** Revenue of the matching day in the previous period (same index as byDay) */
  prevByDay: number[];
  /** 0..23, orders placed in that local hour */
  byHour: { hour: number; orders: number }[];
  /** [weekday 0=Mon..6=Sun][hour 0..23] → orders (local time) */
  byWeekdayHour: number[][];
  /** Every dish sold in the period, best sellers first */
  topItems: { name: string; quantity: number; revenue: number }[];
  /** Available dishes (in visible categories, older than the period) with no sales in it */
  notSelling: { id: string; name: string }[];
  /** Promo codes used in the period: orders, discount given, revenue they brought */
  promos: { code: string; orders: number; discount: number; revenue: number }[];
  byType: { type: "PICKUP" | "DELIVERY" | "DINE_IN"; orders: number; revenue: number }[];
  /** Customers (by phone) who ordered in the period, and how many had ordered before it */
  customers: { total: number; returning: number };
  /** Quantity sold per dish, this period vs the previous one */
  itemMoves: { name: string; cur: number; prev: number }[];
  /** Regulars (2+ orders) whose last order was 30+ days ago */
  lapsedRegulars: number;
  /** Where the money is: by payment method, still unpaid, and what went to fees / discounts / tips */
  money: {
    byMethod: {
      method: "CASH" | "CARD_ON_DELIVERY" | "TRANSFER";
      orders: number;
      revenue: number;
    }[];
    unpaid: { orders: number; amount: number };
    deliveryFees: number;
    discounts: number;
    tips: number;
  };
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

  const lapsedBefore = new Date(now.getTime() - LAPSED_DAYS * DAY_MS);

  const [
    totals,
    byDay,
    byHour,
    topItems,
    byType,
    customers,
    byWeekdayHour,
    itemMoves,
    lapsed,
    byMethod,
    extras,
    notSelling,
    promos,
  ] = await Promise.all([
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
      WHERE ${where(prevFrom, now)}
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
      LIMIT 200`,
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
    prisma.$queryRaw<{ dow: number; h: number; orders: number }[]>`
      SELECT extract(isodow FROM ${local})::int AS dow, extract(hour FROM ${local})::int AS h,
        count(*)::int AS orders
      FROM "Order" o
      WHERE ${where(from, now)}
      GROUP BY 1, 2`,
    prisma.$queryRaw<{ name: string; cur: number; prev: number }[]>`
      SELECT i."name",
        coalesce(sum(i."quantity") FILTER (WHERE o."createdAt" >= ${from}), 0)::int AS cur,
        coalesce(sum(i."quantity") FILTER (WHERE o."createdAt" < ${from}), 0)::int AS prev
      FROM "OrderItem" i
      JOIN "Order" o ON o."id" = i."orderId"
      WHERE ${where(prevFrom, now)}
      GROUP BY i."name"`,
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM (
        SELECT o."customerPhone"
        FROM "Order" o
        WHERE o."storeId" = ${store.id} AND o."status" <> 'CANCELLED' AND o."customerPhone" <> ''
        GROUP BY o."customerPhone"
        HAVING count(*) >= 2 AND max(o."createdAt") < ${lapsedBefore}
      ) r`,
    prisma.$queryRaw<
      {
        method: Analytics["money"]["byMethod"][number]["method"];
        orders: number;
        revenue: bigint;
      }[]
    >`
      SELECT o."paymentMethod"::text AS method, count(*)::int AS orders,
        coalesce(sum(o."total") FILTER (WHERE ${inCurrency}), 0)::bigint AS revenue
      FROM "Order" o
      WHERE ${where(from, now)}
      GROUP BY 1
      ORDER BY revenue DESC`,
    prisma.$queryRaw<
      { unpaid_orders: number; unpaid: bigint; delivery: bigint; discount: bigint; tip: bigint }[]
    >`
      SELECT
        count(*) FILTER (WHERE o."paymentStatus" = 'UNPAID')::int AS unpaid_orders,
        coalesce(sum(o."total") FILTER (WHERE o."paymentStatus" = 'UNPAID'), 0)::bigint AS unpaid,
        coalesce(sum(o."deliveryFee"), 0)::bigint AS delivery,
        coalesce(sum(o."discount"), 0)::bigint AS discount,
        coalesce(sum(o."tip"), 0)::bigint AS tip
      FROM "Order" o
      WHERE ${where(from, now)} AND ${inCurrency}`,
    prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT p."id", p."name"
      FROM "Product" p
      JOIN "Category" c ON c."id" = p."categoryId"
      WHERE p."storeId" = ${store.id} AND p."isAvailable" AND c."isActive"
        AND p."createdAt" < ${from}
        AND NOT EXISTS (
          SELECT 1 FROM "OrderItem" i
          JOIN "Order" o ON o."id" = i."orderId"
          WHERE i."productId" = p."id" AND ${where(from, now)}
        )
      ORDER BY c."sort", p."sort"
      LIMIT 50`,
    prisma.$queryRaw<{ code: string; orders: number; discount: bigint; revenue: bigint }[]>`
      SELECT o."promoCode" AS code, count(*)::int AS orders,
        coalesce(sum(o."discount") FILTER (WHERE ${inCurrency}), 0)::bigint AS discount,
        coalesce(sum(o."total") FILTER (WHERE ${inCurrency}), 0)::bigint AS revenue
      FROM "Order" o
      WHERE ${where(from, now)} AND o."promoCode" IS NOT NULL
      GROUP BY 1
      ORDER BY orders DESC, revenue DESC
      LIMIT 20`,
  ]);

  // Every day of the period, zeros included (a gap in a bar chart reads as "no data")
  const dayMap = new Map(byDay.map((r) => [r.d, r]));
  const dayKeys = Array.from({ length: days }, (_, i) =>
    localDate(new Date(from.getTime() + i * DAY_MS + 12 * 60 * 60_000), tz),
  );
  const prevDayKeys = Array.from({ length: days }, (_, i) =>
    localDate(new Date(prevFrom.getTime() + i * DAY_MS + 12 * 60 * 60_000), tz),
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
    prevByDay: prevDayKeys.map((date) => Number(dayMap.get(date)?.revenue ?? 0)),
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, orders: hourMap.get(hour) ?? 0 })),
    byWeekdayHour: byWeekdayHour.reduce(
      (grid, r) => {
        grid[r.dow - 1][r.h] += r.orders; // isodow: 1 = Monday
        return grid;
      },
      Array.from({ length: 7 }, () => Array<number>(24).fill(0)),
    ),
    topItems: topItems.map((r) => ({ ...r, revenue: Number(r.revenue) })),
    notSelling,
    promos: promos.map((r) => ({
      ...r,
      discount: Number(r.discount),
      revenue: Number(r.revenue),
    })),
    byType: byType.map((r) => ({ ...r, revenue: Number(r.revenue) })),
    customers: customers[0] ?? { total: 0, returning: 0 },
    itemMoves,
    lapsedRegulars: lapsed[0]?.n ?? 0,
    money: {
      byMethod: byMethod.map((r) => ({ ...r, revenue: Number(r.revenue) })),
      unpaid: { orders: extras[0].unpaid_orders, amount: Number(extras[0].unpaid) },
      deliveryFees: Number(extras[0].delivery),
      discounts: Number(extras[0].discount),
      tips: Number(extras[0].tip),
    },
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
