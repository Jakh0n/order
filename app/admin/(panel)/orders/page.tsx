import type { OrderStatus, Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { OrderCard } from "@/components/admin/order-card";
import { AutoRefresh } from "@/components/order/auto-refresh";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { JOIN, prisma } from "@/lib/db";
import { formatUZS } from "@/lib/money";
import { ACTIVE_STATUSES } from "@/lib/orders/status";
import { tashkentDayStart } from "@/lib/store-hours";
import { cn } from "@/lib/utils";

const TABS = ["active", "completed", "cancelled", "all"] as const;
type Tab = (typeof TABS)[number];

const TAB_FILTER: Record<Tab, Prisma.OrderWhereInput> = {
  active: { status: { in: ACTIVE_STATUSES as OrderStatus[] } },
  completed: { status: "COMPLETED" },
  cancelled: { status: "CANCELLED" },
  all: {},
};

const PAGE_SIZE = 50;

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({
  searchParams,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
}) {
  const { store } = await requireOwner();
  const t = await getTranslations("adminOrders");
  const tabParam = (await searchParams).tab;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "active";

  const today = { storeId: store.id, createdAt: { gte: tashkentDayStart() } };
  const [orders, todayStats, todayPaid, activeCount] = await Promise.all([
    prisma.order.findMany({
      ...JOIN,
      where: { storeId: store.id, ...TAB_FILTER[tab] },
      // Faol buyurtmalar: eng eskisi tepada (navbat), qolganlari: eng yangisi tepada
      orderBy: { createdAt: tab === "active" ? "asc" : "desc" },
      take: PAGE_SIZE,
      include: { items: { orderBy: { id: "asc" } } },
    }),
    prisma.order.aggregate({
      where: { ...today, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { ...today, status: { not: "CANCELLED" }, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { storeId: store.id, status: { in: ACTIVE_STATUSES as OrderStatus[] } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{(await getTranslations("admin"))("orders")}</h1>
        <Link href="/admin/orders/new" className={buttonVariants()}>
          <Plus />
          {t("newOrder")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Stat label={t("todayRevenue")} value={formatUZS(todayStats._sum.total ?? 0)} />
        <Stat label={t("todayOrders")} value={String(todayStats._count)} />
        <Stat
          label={t("todayPaid")}
          value={formatUZS(todayPaid._sum.total ?? 0)}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((key) => (
          <Link
            key={key}
            href={key === "active" ? "/admin/orders" : `/admin/orders?tab=${key}`}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm",
              tab === key
                ? "border-primary font-semibold"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t(`tabs.${key}`)}
            {key === "active" && activeCount > 0 && (
              <span className="bg-primary text-primary-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                {activeCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {orders.length === PAGE_SIZE && `${t("showing", { count: PAGE_SIZE })} · `}
        {t("autoRefresh")}
      </p>
      <AutoRefresh intervalMs={20_000} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("bg-card rounded-xl border p-3", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
