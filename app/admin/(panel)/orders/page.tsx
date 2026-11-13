import type { OrderStatus, Prisma } from "@prisma/client";
import { CircleCheck, Flame, Plus, Receipt, Search, Wallet, X } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { NewOrderAlert } from "@/components/admin/new-order-alert";
import { OrderCard } from "@/components/admin/order-card";
import { PageHeader, PageShell, StatTile } from "@/components/admin/page-shell";
import { PushToggle } from "@/components/admin/push-toggle";
import { SetupChecklist } from "@/components/admin/setup-checklist";
import { AutoRefresh } from "@/components/order/auto-refresh";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeBanner } from "@/components/admin/upgrade";
import { requireOwner } from "@/lib/auth/owner";
import { FREE_MONTHLY_ORDERS, isPro } from "@/lib/plan";
import { freeHistoryFilter, ordersThisMonth } from "@/lib/plan-history";
import { JOIN, prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ACTIVE_STATUSES, staleNewOrderIds } from "@/lib/orders/status";
import { startOfDayInZone } from "@/lib/store-hours";
import { receiptUrls } from "@/lib/storage";
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

/** "12" / "#12" → order number; anything else → name or phone */
function searchFilter(q: string): Prisma.OrderWhereInput | null {
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
function dateFilter(date: string, timeZone: string): Prisma.OrderWhereInput | null {
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
  const params = await searchParams;
  const tabParam = params.tab;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "active";
  const q = typeof params.q === "string" ? params.q : "";
  const date = typeof params.date === "string" ? params.date : "";
  const filters = [searchFilter(q), dateFilter(date, store.timeZone)].filter(
    (f): f is Prisma.OrderWhereInput => f !== null,
  );
  const filtering = filters.length > 0;
  // Free plan: finished orders past 100/month are hidden (active ones never are)
  const free = !isPro(store);
  const [historyFilter, monthCount] = free
    ? await Promise.all([freeHistoryFilter(store), ordersThisMonth(store)])
    : [null, 0];
  const listFilters = historyFilter ? [...filters, historyFilter] : filters;

  const today = { storeId: store.id, createdAt: { gte: startOfDayInZone(store.timeZone) } };
  const [orders, todayStats, todayPaid, activeCount, newOrders] = await Promise.all([
    prisma.order.findMany({
      ...JOIN,
      where: { storeId: store.id, ...TAB_FILTER[tab], AND: listFilters },
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
    // For the chime + tab title badge (independent of the tab / filters)
    prisma.order.findMany({
      where: { storeId: store.id, status: "NEW" },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const stale = staleNewOrderIds(orders);
  // Private bucket: short-lived links, one request for the whole page
  const receipts = await receiptUrls(orders.flatMap((o) => (o.receiptPath ? [o.receiptPath] : [])));

  const tAdmin = await getTranslations("admin");
  return (
    <PageShell width="wide">
      <PageHeader
        title={tAdmin("orders")}
        description={tAdmin("descriptions.orders")}
        actions={
          <>
            <PushToggle />
            <NewOrderAlert newIds={newOrders.map((o) => o.id)} />
            <Link href="/admin/orders/new" className={buttonVariants()}>
              <Plus />
              {t("newOrder")}
            </Link>
          </>
        }
      />

      <SetupChecklist storeId={store.id} slug={store.slug} />

      {free && monthCount > FREE_MONTHLY_ORDERS && (
        <UpgradeBanner
          text={t("historyLimit", { count: monthCount, limit: FREE_MONTHLY_ORDERS })}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          icon={Wallet}
          label={t("todayRevenue")}
          value={formatMoney(todayStats._sum.total ?? 0, store.currency)}
        />
        <StatTile icon={Receipt} label={t("todayOrders")} value={String(todayStats._count)} />
        <StatTile
          icon={CircleCheck}
          label={t("todayPaid")}
          value={formatMoney(todayPaid._sum.total ?? 0, store.currency)}
        />
        <StatTile icon={Flame} label={t("activeNow")} value={String(activeCount)} />
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

      {/* Plain GET form: works without JS, the URL can be shared/bookmarked */}
      <form action="/admin/orders" className="flex flex-wrap items-center gap-2">
        {tab !== "active" && <input type="hidden" name="tab" value={tab} />}
        <label className="relative min-w-0 flex-1 basis-48">
          <span className="sr-only">{t("search")}</span>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="h-10 pl-9"
          />
        </label>
        <label>
          <span className="sr-only">{t("date")}</span>
          <Input type="date" name="date" defaultValue={date} className="h-10 w-40" />
        </label>
        <Button type="submit" variant="secondary" className="h-10">
          {t("searchButton")}
        </Button>
        {filtering && (
          <Link
            href={tab === "active" ? "/admin/orders" : `/admin/orders?tab=${tab}`}
            className={buttonVariants({ variant: "ghost", className: "h-10" })}
          >
            <X />
            {t("clearFilters")}
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">
          {filtering ? t("noMatches") : t("empty")}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              timeZone={store.timeZone}
              storeName={store.name}
              channel={store.channel}
              stale={stale.has(order.id)}
              receiptUrl={order.receiptPath ? receipts.get(order.receiptPath) : undefined}
            />
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {orders.length === PAGE_SIZE && `${t("showing", { count: PAGE_SIZE })} · `}
        {t("autoRefresh")}
      </p>
      <AutoRefresh intervalMs={20_000} />
    </PageShell>
  );
}

function OrdersSkeleton() {
  return (
    <PageShell width="wide">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </PageShell>
  );
}
