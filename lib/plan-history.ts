import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { FREE_MONTHLY_ORDERS } from "@/lib/plan";

/**
 * Free plan: in every month, finished orders after the 100th order of that month are hidden
 * from history and search (active orders are always shown — never block the kitchen).
 * Returns a Prisma filter that excludes them, or null when nothing is hidden.
 */
export async function freeHistoryFilter(store: {
  id: string;
  timeZone: string;
}): Promise<Prisma.OrderWhereInput | null> {
  // For each month (store time zone) with more than the limit: when the last kept order came in
  // and when the month ends (both as UTC timestamps, like createdAt)
  const months = await prisma.$queryRaw<{ cutoff: Date; month_end: Date }[]>`
    WITH ranked AS (
      SELECT o."createdAt",
        date_trunc('month', (o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${store.timeZone}) AS m,
        row_number() OVER (
          PARTITION BY date_trunc('month', (o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${store.timeZone})
          ORDER BY o."createdAt"
        ) AS rn
      FROM "Order" o
      WHERE o."storeId" = ${store.id}
    )
    SELECT "createdAt" AS cutoff,
      ((m + interval '1 month') AT TIME ZONE ${store.timeZone}) AT TIME ZONE 'UTC' AS month_end
    FROM ranked
    WHERE rn = ${FREE_MONTHLY_ORDERS}`;
  if (months.length === 0) return null;

  return {
    NOT: {
      status: { in: ["COMPLETED", "CANCELLED"] },
      OR: months.map((m) => ({ createdAt: { gt: m.cutoff, lt: m.month_end } })),
    },
  };
}

/** Orders this month (store time zone) — for the Free plan banner */
export async function ordersThisMonth(store: { id: string; timeZone: string }): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "Order" o
    WHERE o."storeId" = ${store.id}
      AND date_trunc('month', (o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${store.timeZone})
        = date_trunc('month', (now() AT TIME ZONE ${store.timeZone}))`;
  return rows[0]?.n ?? 0;
}
