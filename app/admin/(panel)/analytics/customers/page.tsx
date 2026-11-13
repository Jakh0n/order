import { MessageCircle, Phone, Search } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AnalyticsTabs } from "@/components/admin/analytics/analytics-tabs";
import { ExportButton } from "@/components/admin/export-button";
import { UpgradeCard } from "@/components/admin/upgrade";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { CUSTOMER_SORTS, type CustomerSort, listCustomers } from "@/lib/customers/data";
import { formatMoney } from "@/lib/money";
import { isPro } from "@/lib/plan";
import { cn } from "@/lib/utils";

export default function CustomersPage({ searchParams }: PageProps<"/admin/analytics/customers">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <Suspense fallback={<CustomersSkeleton />}>
        <CustomersView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CustomersView({
  searchParams,
}: Pick<PageProps<"/admin/analytics/customers">, "searchParams">) {
  const [{ store }, params] = await Promise.all([requireOwner(), searchParams]);
  if (!isPro(store)) {
    const t = await getTranslations("analytics");
    return (
      <>
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1 max-w-prose text-sm">{t("description")}</p>
          </div>
          <AnalyticsTabs />
        </div>
        <UpgradeCard title={t("customersLockedTitle")} text={t("customersLockedText")} />
      </>
    );
  }
  const q = typeof params.q === "string" ? params.q : "";
  const sort: CustomerSort = CUSTOMER_SORTS.includes(params.sort as CustomerSort)
    ? (params.sort as CustomerSort)
    : "recent";
  const [{ customers, total }, t, format] = await Promise.all([
    listCustomers(store, { q, sort }),
    getTranslations("analytics"),
    getFormatter(),
  ]);
  const money = (minor: number) => formatMoney(minor, store.currency);
  const date = (d: Date) =>
    format.dateTime(d, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: store.timeZone,
    });
  const sortHref = (s: CustomerSort) =>
    `/admin/analytics/customers?${new URLSearchParams({ ...(q && { q }), sort: s })}`;
  const chatHref = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return store.channel === "TELEGRAM" ? `https://t.me/+${digits}` : `https://wa.me/${digits}`;
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">{t("description")}</p>
        </div>
        <AnalyticsTabs />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{t("customersLead", { count: total })}</p>
        <ExportButton
          pro
          href={`/admin/export/customers?${new URLSearchParams({ ...(q && { q }), sort })}`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* GET form: search survives reloads, no client JS */}
        <form className="relative w-full sm:max-w-xs" action="/admin/analytics/customers">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="h-10 pl-9"
          />
          <input type="hidden" name="sort" value={sort} />
        </form>
        <div
          role="radiogroup"
          aria-label={t("sortBy")}
          className="bg-muted flex w-fit rounded-xl p-1"
        >
          {CUSTOMER_SORTS.map((s) => (
            <Link
              key={s}
              href={sortHref(s)}
              replace
              role="radio"
              aria-checked={s === sort}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                s === sort
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`sort.${s}`)}
            </Link>
          ))}
        </div>
      </div>

      {customers.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-12 text-center">
          {q ? t("noMatches") : t("noCustomers")}
        </p>
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {customers.map((c) => (
            <li key={c.phone} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:p-4">
              {/* Phone: name + buttons on the first row, numbers below; desktop: one row */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full font-semibold">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2 font-medium">
                    <span className="truncate">{c.name}</span>
                    {c.orders > 1 && (
                      <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        {t("regular")}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">{c.phone}</p>
                </div>
              </div>

              <dl className="order-last flex w-full gap-5 pl-[52px] text-sm tabular-nums sm:order-none sm:w-auto sm:pl-0">
                <div>
                  <dt className="text-muted-foreground text-xs">{t("orders")}</dt>
                  <dd className="font-semibold">{c.orders}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">{t("spent")}</dt>
                  <dd className="font-semibold">{money(c.spent)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">{t("lastOrder")}</dt>
                  <dd>{date(c.lastAt)}</dd>
                </div>
              </dl>

              <div className="flex gap-1">
                <a
                  href={`tel:${c.phone}`}
                  aria-label={t("call", { name: c.name })}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <Phone className="size-4" />
                </a>
                <a
                  href={chatHref(c.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("message", { name: c.name })}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <MessageCircle className="size-4" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      {customers.length >= 200 && <p className="text-muted-foreground text-xs">{t("limitNote")}</p>}
    </>
  );
}

function CustomersSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-72 w-full" />
    </>
  );
}
