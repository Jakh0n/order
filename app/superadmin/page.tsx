import {
  Ban,
  ExternalLink,
  Gem,
  LogOut,
  Receipt,
  Search,
  Store as StoreIcon,
  Wallet,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageShell, StatTile } from "@/components/admin/page-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SentryTest } from "@/components/superadmin/sentry-test";
import { StoreActions } from "@/components/superadmin/store-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser, requireSuperadmin } from "@/lib/auth/owner";
import { formatMoney } from "@/lib/money";
import {
  getPlatformStats,
  listStores,
  STORE_FILTERS,
  type StoreFilter,
  type SuperadminStore,
} from "@/lib/superadmin/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

export default function SuperadminPage({ searchParams }: PageProps<"/superadmin">) {
  return (
    <div className="bg-muted/50 min-h-full flex-1">
      <Suspense fallback={<PageSkeleton />}>
        <Superadmin searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Superadmin({
  searchParams,
}: {
  searchParams: PageProps<"/superadmin">["searchParams"];
}) {
  await requireSuperadmin();
  const current = await getCurrentUser();
  const [t, params] = await Promise.all([getTranslations("superadmin"), searchParams]);
  const q = typeof params.q === "string" ? params.q : "";
  const filter: StoreFilter = STORE_FILTERS.includes(params.status as StoreFilter)
    ? (params.status as StoreFilter)
    : "all";

  // requireSuperadmin cookies() ni o'qigan — endi joriy vaqtni ishlatish mumkin
  const now = new Date();
  const [stats, stores] = await Promise.all([
    getPlatformStats(now),
    listStores(q, now, filter),
  ]);
  const filterHref = (f: StoreFilter) =>
    `/superadmin?${new URLSearchParams({ ...(q && { q }), ...(f !== "all" && { status: f }) })}`;

  return (
    <>
      {/* Top bar */}
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
              F
            </span>
            <p className="truncate font-semibold">{t("title")}</p>
          </div>
          <div className="flex items-center gap-1">
            {current?.store && (
              <Link
                href="/admin/orders"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t("adminPanel")}
              </Link>
            )}
            <LanguageSwitcher />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" aria-label={t("logout")}>
                <LogOut />
                <span className="hidden sm:inline">{t("logout")}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <PageShell width="wide">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatTile icon={StoreIcon} label={t("stores")} value={String(stats.stores)} />
          <StatTile icon={Gem} label={t("paid")} value={String(stats.paid)} />
          <StatTile icon={Ban} label={t("blocked")} value={String(stats.blocked)} />
          <StatTile icon={Receipt} label={t("orders30")} value={String(stats.orders30)} />
          <StatTile
            icon={Wallet}
            label={t("revenue30")}
            className="col-span-2 md:col-span-1"
            value={
              stats.revenue30.length
                ? stats.revenue30.map((r) => formatMoney(r.total, r.currency)).join(" · ")
                : "—"
            }
          />
        </div>

        <section className="bg-card flex flex-col rounded-xl border">
          {/* Filters + search */}
          <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label={t("filter")} className="bg-muted flex w-fit rounded-lg p-1">
              {STORE_FILTERS.map((f) => (
                <Link
                  key={f}
                  href={filterHref(f)}
                  aria-current={f === filter ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    f === filter
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`filters.${f}`)}
                </Link>
              ))}
            </nav>
            <form className="relative w-full sm:max-w-xs" role="search">
              {filter !== "all" && <input type="hidden" name="status" value={filter} />}
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                name="q"
                defaultValue={q}
                placeholder={t("search")}
                aria-label={t("search")}
                maxLength={100}
                className="h-9 pl-9"
              />
            </form>
          </div>

          {stores.length === 0 ? (
            <p className="text-muted-foreground py-14 text-center text-sm">{t("empty")}</p>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-left text-xs">
                    <tr className="border-b">
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        {t("store")}
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        {t("owner")}
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        {t("plan")}
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">
                        {t("orders30")}
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">
                        {t("dishes")}
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        {t("created")}
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        <span className="sr-only">{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stores.map((store) => (
                      <StoreRow key={store.id} store={store} />
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Phone / tablet: cards */}
              <ul className="divide-y lg:hidden">
                {stores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Developer tools out of the main flow */}
        <details className="bg-card group rounded-xl border">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Wrench className="size-4" aria-hidden />
            {t("tools")}
          </summary>
          <div className="border-t p-4">
            <SentryTest />
          </div>
        </details>
      </PageShell>
    </>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"superadmin">>>;
type F = Awaited<ReturnType<typeof getFormatter>>;

function planBadge(store: SuperadminStore, t: T, format: F) {
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });
  if (store.plan === "FREE") return <Badge variant="outline">{t("planFree")}</Badge>;
  if (store.paidExpired && store.paidUntil) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
        {t("expired", { date: date(store.paidUntil) })}
      </Badge>
    );
  }
  return (
    <Badge>
      {t("planPaid")} ·{" "}
      {store.paidUntil ? t("paidUntil", { date: date(store.paidUntil) }) : t("unlimited")}
    </Badge>
  );
}

async function StoreRow({ store }: { store: SuperadminStore }) {
  const [t, format] = await Promise.all([getTranslations("superadmin"), getFormatter()]);
  return (
    <tr className={cn("hover:bg-muted/40 align-middle", store.isBlocked && "bg-destructive/5")}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{store.name}</span>
          {store.isBlocked && <Badge variant="destructive">{t("blockedBadge")}</Badge>}
        </div>
        <Link
          href={`/${store.slug}`}
          target="_blank"
          className="text-primary inline-flex items-center gap-1 text-xs"
        >
          /{store.slug}
          <ExternalLink className="size-3" aria-hidden />
        </Link>
      </td>
      <td className="text-muted-foreground max-w-56 truncate px-4 py-3">{store.owner.email}</td>
      <td className="px-4 py-3">{planBadge(store, t, format)}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className="font-medium">{store.orders30}</span>
        <span className="text-muted-foreground"> / {store._count.orders}</span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{store._count.products}</td>
      <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
        {format.dateTime(store.createdAt, { dateStyle: "medium" })}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <StoreActions
            storeId={store.id}
            name={store.name}
            plan={store.plan}
            isBlocked={store.isBlocked}
          />
        </div>
      </td>
    </tr>
  );
}

async function StoreCard({ store }: { store: SuperadminStore }) {
  const [t, format] = await Promise.all([getTranslations("superadmin"), getFormatter()]);
  return (
    <li className={cn("flex flex-col gap-3 p-4", store.isBlocked && "bg-destructive/5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{store.name}</p>
          <Link
            href={`/${store.slug}`}
            target="_blank"
            className="text-primary flex items-center gap-1 text-sm"
          >
            /{store.slug}
            <ExternalLink className="size-3" aria-hidden />
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {store.isBlocked && <Badge variant="destructive">{t("blockedBadge")}</Badge>}
          {planBadge(store, t, format)}
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("owner")}</dt>
        <dd className="truncate">{store.owner.email}</dd>
        <dt className="text-muted-foreground">{t("orders30")}</dt>
        <dd className="tabular-nums">
          {t("ordersCount", { total: store._count.orders, recent: store.orders30 })} ·{" "}
          {t("products", { count: store._count.products })}
        </dd>
        <dt className="text-muted-foreground">{t("created")}</dt>
        <dd>{format.dateTime(store.createdAt, { dateStyle: "medium" })}</dd>
      </dl>
      <StoreActions
        storeId={store.id}
        name={store.name}
        plan={store.plan}
        isBlocked={store.isBlocked}
      />
    </li>
  );
}

function PageSkeleton() {
  return (
    <PageShell width="wide">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </PageShell>
  );
}
