import "server-only";

import type { Prisma } from "@prisma/client";

import { JOIN, prisma } from "@/lib/db";

const DAY = 24 * 60 * 60 * 1000;

/** Platforma bo'yicha umumiy ko'rsatkichlar (oxirgi 30 kun) */
export async function getPlatformStats(now: Date) {
  const since = new Date(now.getTime() - 30 * DAY);
  const [stores, blocked, paid, orders30] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { isBlocked: true } }),
    prisma.store.count({
      where: { plan: "PAID", OR: [{ paidUntil: null }, { paidUntil: { gte: now } }] },
    }),
    // Different stores use different currencies — sum per currency, never across them
    prisma.order.groupBy({
      by: ["currency"],
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
      _count: true,
      _sum: { total: true },
      orderBy: { currency: "asc" },
    }),
  ]);
  return {
    stores,
    blocked,
    paid,
    orders30: orders30.reduce((sum, r) => sum + r._count, 0),
    revenue30: orders30.map((r) => ({ currency: r.currency, total: r._sum.total ?? 0 })),
  };
}

const PAGE_SIZE = 100;

/** Do'konlar ro'yxati: nom, slug yoki ega emaili bo'yicha qidiruv */
export const STORE_FILTERS = ["all", "pro", "free", "blocked"] as const;
export type StoreFilter = (typeof STORE_FILTERS)[number];

export async function listStores(query: string, now: Date, filter: StoreFilter = "all") {
  const q = query.trim().slice(0, 100);
  const search: Prisma.StoreWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q.toLowerCase() } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  // "pro" = paid and not expired (same rule as lib/plan.ts)
  const byFilter: Record<StoreFilter, Prisma.StoreWhereInput> = {
    all: {},
    pro: { plan: "PAID", OR: [{ paidUntil: null }, { paidUntil: { gt: now } }] },
    free: { OR: [{ plan: "FREE" }, { plan: "PAID", paidUntil: { lte: now } }] },
    blocked: { isBlocked: true },
  };
  const where: Prisma.StoreWhereInput = { AND: [search, byFilter[filter]] };

  const stores = await prisma.store.findMany({
    ...JOIN,
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      slug: true,
      name: true,
      plan: true,
      paidUntil: true,
      isBlocked: true,
      createdAt: true,
      owner: { select: { email: true } },
      _count: { select: { orders: true, products: true } },
    },
  });

  const recent = await prisma.order.groupBy({
    by: ["storeId"],
    where: {
      storeId: { in: stores.map((s) => s.id) },
      createdAt: { gte: new Date(now.getTime() - 30 * DAY) },
    },
    _count: true,
  });
  const recentByStore = new Map(recent.map((r) => [r.storeId, r._count]));

  return stores.map((s) => ({
    ...s,
    orders30: recentByStore.get(s.id) ?? 0,
    /** PAID, lekin muddati o'tgan */
    paidExpired: s.plan === "PAID" && !!s.paidUntil && s.paidUntil < now,
  }));
}

export type SuperadminStore = Awaited<ReturnType<typeof listStores>>[number];
