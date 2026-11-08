import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

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
    prisma.order.aggregate({
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
      _count: true,
      _sum: { total: true },
    }),
  ]);
  return {
    stores,
    blocked,
    paid,
    orders30: orders30._count,
    revenue30: orders30._sum.total ?? 0,
  };
}

const PAGE_SIZE = 100;

/** Do'konlar ro'yxati: nom, slug yoki ega emaili bo'yicha qidiruv */
export async function listStores(query: string, now: Date) {
  const q = query.trim().slice(0, 100);
  const where: Prisma.StoreWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q.toLowerCase() } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const stores = await prisma.store.findMany({
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
