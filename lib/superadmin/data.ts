import "server-only";

import { Prisma } from "@prisma/client";

import { JOIN, prisma } from "@/lib/db";
import { DEMO_STORE_SLUGS, isDemoStore, realStores } from "@/lib/demo";

const DAY = 24 * 60 * 60 * 1000;

/** Platforma bo'yicha umumiy ko'rsatkichlar (oxirgi 30 kun) */
export async function getPlatformStats(now: Date) {
  const since = new Date(now.getTime() - 30 * DAY);
  const [stores, blocked, paid, orders30] = await Promise.all([
    // Demo stores (sample orders and reviews) never count as platform numbers
    prisma.store.count({ where: realStores }),
    prisma.store.count({ where: { ...realStores, isBlocked: true } }),
    prisma.store.count({
      where: {
        ...realStores,
        plan: "PAID",
        OR: [{ paidUntil: null }, { paidUntil: { gte: now } }],
      },
    }),
    // Different stores use different currencies — sum per currency, never across them
    prisma.order.groupBy({
      by: ["currency"],
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" }, store: realStores },
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

/** Store counts for the growth funnel (docs/marketing/METRICS.md definitions) */
export interface FunnelCounts {
  stores: number;
  signups30: number;
  /** ≥3 dishes + order channel set + ≥1 real order ever */
  live: number;
  /** ≥1 real order in the last 7 days */
  active: number;
  /** ≥10 real orders in the last 30 days */
  healthy: number;
}

/** Signup source: utm_source / ?ref=, else the referring site; null = direct or before tracking */
export type SourceRow = FunnelCounts & { source: string | null };

/**
 * Growth funnel by signup source. A real order = placed by a customer on the store page
 * (Order.source ONLINE: not manual, not the owner testing) and not cancelled.
 */
export async function getGrowthStats(now: Date) {
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const rows = await prisma.$queryRaw<SourceRow[]>`
    WITH real_orders AS (
      SELECT "storeId",
        count(*)::int AS total,
        (count(*) FILTER (WHERE "createdAt" >= ${since7}))::int AS last7,
        (count(*) FILTER (WHERE "createdAt" >= ${since30}))::int AS last30
      FROM "Order"
      WHERE "source" = 'ONLINE' AND "status" <> 'CANCELLED'
      GROUP BY "storeId"
    ),
    dishes AS (
      SELECT "storeId", count(*)::int AS n FROM "Product" GROUP BY "storeId"
    ),
    s AS (
      SELECT
        st."createdAt",
        coalesce(st."signupSource", st."signupReferrer") AS source,
        coalesce(d.n, 0) >= 3
          AND CASE st."channel"
            WHEN 'TELEGRAM' THEN coalesce(st."telegramUsername", '') <> ''
            ELSE coalesce(st."whatsappNumber", '') <> ''
          END
          AND coalesce(r.total, 0) >= 1 AS live,
        coalesce(r.last7, 0) >= 1 AS active,
        coalesce(r.last30, 0) >= 10 AS healthy
      FROM "Store" st
      LEFT JOIN real_orders r ON r."storeId" = st."id"
      LEFT JOIN dishes d ON d."storeId" = st."id"
      WHERE st."slug" NOT IN (${Prisma.join([...DEMO_STORE_SLUGS])})
    )
    SELECT
      source,
      count(*)::int AS stores,
      (count(*) FILTER (WHERE "createdAt" >= ${since30}))::int AS "signups30",
      (count(*) FILTER (WHERE live))::int AS live,
      (count(*) FILTER (WHERE active))::int AS active,
      (count(*) FILTER (WHERE healthy))::int AS healthy
    FROM s
    GROUP BY source
    ORDER BY stores DESC, source
  `;
  const totals: FunnelCounts = { stores: 0, signups30: 0, live: 0, active: 0, healthy: 0 };
  for (const row of rows) {
    for (const key of Object.keys(totals) as (keyof FunnelCounts)[]) totals[key] += row[key];
  }
  return { totals, bySource: rows };
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
      signupSource: true,
      signupReferrer: true,
      signupCampaign: true,
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
    isDemo: isDemoStore(s.slug),
  }));
}

export type SuperadminStore = Awaited<ReturnType<typeof listStores>>[number];
