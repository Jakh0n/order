import type { OrderStatus, Prisma } from "@prisma/client";
import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ExportButton } from "@/components/admin/export-button";
import { NewOrderAlert } from "@/components/admin/new-order-alert";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderCard } from "@/components/admin/order-card";
import { OrderRow } from "@/components/admin/order-row";
import { OrderRowSummary } from "@/components/admin/order-row-summary";
import { PageHeader, PageShell } from "@/components/admin/page-shell";
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
import { getRequestOrigin } from "@/lib/app-url";
import { JOIN, prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ACTIVE_STATUSES, staleNewOrderIds } from "@/lib/orders/status";
import { startOfDayInZone } from "@/lib/store-hours";
import {
  dateFilter,
  ORDER_TABS,
  type OrderTab,
  searchFilter,
  TAB_FILTER,
} from "@/lib/orders/filters";
import { receiptUrls } from "@/lib/storage";
import { cn } from "@/lib/utils";

const TABS = ORDER_TABS;
type Tab = OrderTab;

const PAGE_SIZE = 50;

/** Active tab chips: one status at a time (or all active) */
const STATUS_CHIPS = ["NEW", "ACCEPTED", "READY", "ON_THE_WAY"] as const;
type StatusChip = (typeof STATUS_CHIPS)[number];

function ordersHref(tab: Tab, status?: StatusChip) {
  const qs = new URLSearchParams();
  if (tab !== "active") qs.set("tab", tab);
  if (status) qs.set("status", status);
  const s = qs.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
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
  const statusParam = typeof params.status === "string" ? params.status : "";
  const statusChip =
    tab === "active" && STATUS_CHIPS.includes(statusParam as StatusChip)
      ? (statusParam as StatusChip)
      : undefined;
  const q = typeof params.q === "string" ? params.q : "";
  const date = typeof params.date === "string" ? params.date : "";
  // Search and date live on the history tabs; the live queue uses the status chips
  const filters = (
    tab === "active" ? [] : [searchFilter(q), dateFilter(date, store.timeZone)]
  ).filter((f): f is Prisma.OrderWhereInput => f !== null);
  const filtering = filters.length > 0;
  // Free plan: finished orders past 100/month are hidden (active ones never are)
  const free = !isPro(store);
  const [historyFilter, monthCount] = free
    ? await Promise.all([freeHistoryFilter(store), ordersThisMonth(store)])
    : [null, 0];
  const listFilters = historyFilter ? [...filters, historyFilter] : filters;

  const today = { storeId: store.id, createdAt: { gte: startOfDayInZone(store.timeZone) } };
  const [orders, todayStats, todayPaid, activeByStatus, newOrders] = await Promise.all([
    prisma.order.findMany({
      ...JOIN,
      where: {
        storeId: store.id,
        ...(statusChip ? { status: statusChip } : TAB_FILTER[tab]),
        AND: listFilters,
      },
      // Faol buyurtmalar: eng eskisi tepada (navbat), qolganlari: eng yangisi tepada
      orderBy: { createdAt: tab === "active" ? "asc" : "desc" },
      take: PAGE_SIZE,
      include: { items: { orderBy: { id: "asc" } }, review: { select: { rating: true } } },
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
    prisma.order.groupBy({
      by: ["status"],
      where: { storeId: store.id, status: { in: ACTIVE_STATUSES as OrderStatus[] } },
      _count: true,
    }),
    // For the chime + tab title badge (independent of the tab / filters)
    prisma.order.findMany({
      where: { storeId: store.id, status: "NEW" },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const countOf = (status: OrderStatus) =>
    activeByStatus.find((g) => g.status === status)?._count ?? 0;
  const activeCount = activeByStatus.reduce((sum, g) => sum + g._count, 0);
  const now = new Date();
  const stale = staleNewOrderIds(orders, now);
  // Private bucket: short-lived links, one request for the whole page
  const [origin, receipts] = await Promise.all([
    getRequestOrigin(),
    receiptUrls(orders.flatMap((o) => (o.receiptPath ? [o.receiptPath] : []))),
  ]);

  const [tAdmin, t2] = await Promise.all([getTranslations("admin"), getTranslations()]);
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

      {/* Today at a glance — one slim line, so the orders start high on the screen */}
      <dl className="bg-card flex flex-wrap gap-x-6 gap-y-2 rounded-xl border px-4 py-3 text-sm">
        {(
          [
            ["todayRevenue", formatMoney(todayStats._sum.total ?? 0, store.currency)],
            ["todayOrders", String(todayStats._count)],
            ["todayPaid", formatMoney(todayPaid._sum.total ?? 0, store.currency)],
            ["activeNow", String(activeCount)],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t(key)}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((key) => (
          <Link
            key={key}
            href={ordersHref(key)}
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

      {tab === "active" && (
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={t("filterStatus")}>
          {[undefined, ...STATUS_CHIPS].map((chip) => {
            const selected = chip === statusChip;
            const count = chip ? countOf(chip) : activeCount;
            return (
              <Link
                key={chip ?? "all"}
                href={ordersHref("active", chip)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
                  selected
                    ? "bg-foreground text-background border-foreground font-semibold"
                    : "bg-card hover:bg-muted",
                )}
              >
                {chip ? t2(`status.${chip}`) : t("tabs.all")}
                <span className={cn("tabular-nums", !selected && "text-muted-foreground")}>
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Plain GET form: works without JS, the URL can be shared/bookmarked */}
      {tab !== "active" && (
        <form action="/admin/orders" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
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
              href={ordersHref(tab)}
              className={buttonVariants({ variant: "ghost", className: "h-10" })}
            >
              <X />
              {t("clearFilters")}
            </Link>
          )}
          <span className="sm:ml-auto">
            <ExportButton
              pro={!free}
              href={`/admin/export/orders?${new URLSearchParams({
                tab,
                ...(q && { q }),
                ...(date && { date }),
              })}`}
            />
          </span>
        </form>
      )}

      {orders.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">
          {filtering ? t("noMatches") : t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              label={t("openOrder", { number: order.number })}
              title={t("orderTitle", { number: order.number })}
              muted={order.status === "CANCELLED"}
              summary={
                <OrderRowSummary
                  order={order}
                  timeZone={store.timeZone}
                  now={now}
                  stale={stale.has(order.id)}
                />
              }
              action={
                order.status === "COMPLETED" || order.status === "CANCELLED" ? undefined : (
                  <OrderActions
                    compact
                    orderId={order.id}
                    number={order.number}
                    status={order.status}
                    type={order.type}
                    paid={order.paymentStatus === "PAID"}
                  />
                )
              }
              details={
                <OrderCard
                  plain
                  order={order}
                  timeZone={store.timeZone}
                  storeName={store.name}
                  channel={store.channel}
                  stale={stale.has(order.id)}
                  receiptUrl={order.receiptPath ? receipts.get(order.receiptPath) : undefined}
                  origin={origin}
                />
              }
            />
          ))}
        </ul>
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
