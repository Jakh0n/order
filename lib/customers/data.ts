import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

// Customer base: grouped by phone number (table orders without a phone are not customers here).
// Money only from orders in the store's current currency.

export const CUSTOMER_SORTS = ["recent", "orders", "spent"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];
/** The page shows this many; the CSV export asks for more */
const LIMIT = 200;

export interface Customer {
  phone: string;
  /** Name from the latest order */
  name: string;
  orders: number;
  spent: number;
  firstAt: Date;
  lastAt: Date;
}

export async function listCustomers(
  store: { id: string; currency: string },
  { q, sort, limit = LIMIT }: { q: string; sort: CustomerSort; limit?: number },
): Promise<{ customers: Customer[]; total: number }> {
  const search = q.trim().slice(0, 50);
  const like = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
  const digits = search.replace(/\D/g, "");
  const filter = search
    ? Prisma.sql`HAVING (array_agg(o."customerName" ORDER BY o."createdAt" DESC))[1] ILIKE ${like}
        ${digits ? Prisma.sql`OR o."customerPhone" LIKE ${`%${digits}%`}` : Prisma.empty}`
    : Prisma.empty;
  const order =
    sort === "orders"
      ? Prisma.sql`orders DESC, last_at DESC`
      : sort === "spent"
        ? Prisma.sql`spent DESC, last_at DESC`
        : Prisma.sql`last_at DESC`;

  const base = Prisma.sql`
    FROM "Order" o
    WHERE o."storeId" = ${store.id} AND o."status" <> 'CANCELLED' AND o."customerPhone" <> ''
    GROUP BY o."customerPhone"`;

  const [rows, count] = await Promise.all([
    prisma.$queryRaw<
      {
        phone: string;
        name: string;
        orders: number;
        spent: bigint;
        first_at: Date;
        last_at: Date;
      }[]
    >`
      SELECT o."customerPhone" AS phone,
        (array_agg(o."customerName" ORDER BY o."createdAt" DESC))[1] AS name,
        count(*)::int AS orders,
        coalesce(sum(o."total") FILTER (WHERE o."currency" = ${store.currency}), 0)::bigint AS spent,
        min(o."createdAt") AS first_at,
        max(o."createdAt") AS last_at
      ${base}
      ${filter}
      ORDER BY ${order}
      LIMIT ${limit}`,
    prisma.$queryRaw<{ total: number }[]>`
      SELECT count(DISTINCT o."customerPhone")::int AS total
      FROM "Order" o
      WHERE o."storeId" = ${store.id} AND o."status" <> 'CANCELLED' AND o."customerPhone" <> ''`,
  ]);

  return {
    customers: rows.map((r) => ({
      phone: r.phone,
      name: r.name,
      orders: r.orders,
      spent: Number(r.spent),
      firstAt: r.first_at,
      lastAt: r.last_at,
    })),
    total: count[0]?.total ?? 0,
  };
}
