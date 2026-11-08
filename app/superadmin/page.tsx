import { ExternalLink, LogOut, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SentryTest } from "@/components/superadmin/sentry-test";
import { StoreActions } from "@/components/superadmin/store-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser, requireSuperadmin } from "@/lib/auth/owner";
import { formatUZS } from "@/lib/money";
import { getPlatformStats, listStores, type SuperadminStore } from "@/lib/superadmin/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

export default function SuperadminPage({ searchParams }: PageProps<"/superadmin">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Superadmin searchParams={searchParams} />
    </Suspense>
  );
}

async function Superadmin({
  searchParams,
}: {
  searchParams: PageProps<"/superadmin">["searchParams"];
}) {
  await requireSuperadmin();
  const current = await getCurrentUser();
  const t = await getTranslations("superadmin");
  const qParam = (await searchParams).q;
  const q = typeof qParam === "string" ? qParam : "";

  // requireSuperadmin cookies() ni o'qigan — endi joriy vaqtni ishlatish mumkin
  const now = new Date();
  const [stats, stores] = await Promise.all([getPlatformStats(now), listStores(q, now)]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          {current?.store && (
            <Link
              href="/admin/orders"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("adminPanel")}
            </Link>
          )}
          <LanguageSwitcher />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut />
              {t("logout")}
            </Button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label={t("stores")} value={String(stats.stores)} />
        <Stat label={t("paid")} value={String(stats.paid)} />
        <Stat label={t("blocked")} value={String(stats.blocked)} />
        <Stat label={t("orders30")} value={String(stats.orders30)} />
        <Stat
          label={t("revenue30")}
          value={formatUZS(stats.revenue30)}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <SentryTest />

      <form className="flex gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("search")}
          aria-label={t("search")}
          maxLength={100}
        />
        <Button type="submit" variant="outline">
          <Search />
          <span className="hidden sm:inline">{t("searchButton")}</span>
        </Button>
      </form>

      {stores.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </ul>
      )}
    </div>
  );
}

async function StoreCard({ store }: { store: SuperadminStore }) {
  const t = await getTranslations("superadmin");
  const format = await getFormatter();
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });

  let planLabel: string;
  if (store.plan === "FREE") planLabel = t("planFree");
  else if (!store.paidUntil) planLabel = `${t("planPaid")} · ${t("unlimited")}`;
  else if (store.paidExpired) planLabel = t("expired", { date: date(store.paidUntil) });
  else planLabel = `${t("planPaid")} · ${t("paidUntil", { date: date(store.paidUntil) })}`;

  return (
    <li
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4",
        store.isBlocked && "border-destructive/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{store.name}</p>
          <Link
            href={`/${store.slug}`}
            target="_blank"
            className="text-primary flex items-center gap-1 text-sm"
          >
            /{store.slug}
            <ExternalLink className="size-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {store.isBlocked && <Badge variant="destructive">{t("blockedBadge")}</Badge>}
          <Badge
            variant={store.plan === "PAID" && !store.paidExpired ? "default" : "outline"}
            className={cn(store.paidExpired && "border-amber-500 text-amber-600")}
          >
            {planLabel}
          </Badge>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("owner")}</dt>
        <dd className="truncate">{store.owner.email}</dd>
        <dt className="text-muted-foreground">{t("created")}</dt>
        <dd>{date(store.createdAt)}</dd>
        <dt className="text-muted-foreground">{t("orders30")}</dt>
        <dd>
          {t("ordersCount", { total: store._count.orders, recent: store.orders30 })} ·{" "}
          {t("products", { count: store._count.products })}
        </dd>
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

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("bg-card rounded-xl border p-3", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
