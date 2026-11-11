import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AnalyticsTabs } from "@/components/admin/analytics/analytics-tabs";
import { BarChart } from "@/components/admin/analytics/bar-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalytics, parsePeriod, PERIODS } from "@/lib/analytics/data";
import { requireOwner } from "@/lib/auth/owner";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export default function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  return (
    <div className="flex max-w-5xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AnalyticsView({
  searchParams,
}: Pick<PageProps<"/admin/analytics">, "searchParams">) {
  const [{ store }, params] = await Promise.all([requireOwner(), searchParams]);
  const period = parsePeriod(params.period);
  const [data, t, format] = await Promise.all([
    getAnalytics(store, period),
    getTranslations("analytics"),
    getFormatter(),
  ]);
  const money = (minor: number) => formatMoney(minor, store.currency);
  const { current, previous } = data;
  const avg = (x: { orders: number; revenue: number }) =>
    x.orders > 0 ? Math.round(x.revenue / x.orders) : 0;
  const returningPct =
    data.customers.total > 0
      ? Math.round((data.customers.returning / data.customers.total) * 100)
      : 0;
  // Local "YYYY-MM-DD" → a Date that formats as that calendar day in UTC
  const day = (d: string) => new Date(`${d}T12:00:00Z`);

  const dayTick = data.days <= 7 ? 1 : data.days <= 30 ? 5 : 15;
  const dayAxis = (d: string) =>
    data.days <= 7
      ? format.dateTime(day(d), { weekday: "short", timeZone: "UTC" })
      : format.dateTime(day(d), { day: "numeric", month: "short", timeZone: "UTC" });
  const maxType = Math.max(...data.byType.map((r) => r.orders), 1);
  const maxItem = Math.max(...data.topItems.map((r) => r.quantity), 1);
  const empty = current.orders === 0;

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <AnalyticsTabs />
      </div>

      {/* Period — links, so it survives reloads and can be shared */}
      <div
        role="radiogroup"
        aria-label={t("period")}
        className="bg-muted flex w-fit rounded-xl p-1"
      >
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/analytics?period=${p}`}
            replace
            role="radio"
            aria-checked={p === period}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              p === period
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`periods.${p}`)}
          </Link>
        ))}
      </div>

      {/* KPI tiles — the headline numbers, each compared with the previous period */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label={t("revenue")}
          value={money(current.revenue)}
          delta={change(current.revenue, previous.revenue)}
          compare={t(`vs.${period}`)}
          t={t}
        />
        <Kpi
          label={t("orders")}
          value={format.number(current.orders)}
          delta={change(current.orders, previous.orders)}
          compare={t(`vs.${period}`)}
          t={t}
        />
        <Kpi
          label={t("avgOrder")}
          value={money(avg(current))}
          delta={change(avg(current), avg(previous))}
          compare={t(`vs.${period}`)}
          t={t}
        />
        <Kpi
          label={t("returning")}
          value={`${returningPct}%`}
          sub={t("returningOf", {
            returning: data.customers.returning,
            total: data.customers.total,
          })}
          t={t}
        />
      </div>

      {empty ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-12 text-center">
          {t("empty")}
        </p>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.days > 1 && (
              <Panel title={t("revenueByDay")} className="lg:col-span-2">
                <BarChart
                  label={t("revenueByDay")}
                  maxLabel={money(Math.max(...data.byDay.map((d) => d.revenue)))}
                  tickEvery={dayTick}
                  data={data.byDay.map((d) => ({
                    key: d.date,
                    axis: dayAxis(d.date),
                    title: format.dateTime(day(d.date), {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    }),
                    detail: `${money(d.revenue)} · ${t("ordersCount", { count: d.orders })}`,
                    value: d.revenue,
                  }))}
                />
              </Panel>
            )}

            <Panel title={t("byHour")} hint={t("byHourHint")}>
              <BarChart
                label={t("byHour")}
                maxLabel={t("ordersCount", {
                  count: Math.max(...data.byHour.map((h) => h.orders)),
                })}
                tickEvery={3}
                data={data.byHour.map((h) => ({
                  key: String(h.hour),
                  axis: String(h.hour).padStart(2, "0"),
                  title: `${String(h.hour).padStart(2, "0")}:00–${String(h.hour).padStart(2, "0")}:59`,
                  detail: t("ordersCount", { count: h.orders }),
                  value: h.orders,
                }))}
              />
            </Panel>

            <Panel title={t("byType")}>
              <ul className="flex flex-col gap-3">
                {data.byType.map((r) => (
                  <MeterRow
                    key={r.type}
                    label={t(`types.${r.type}`)}
                    value={t("ordersCount", { count: r.orders })}
                    sub={money(r.revenue)}
                    pct={(r.orders / maxType) * 100}
                  />
                ))}
              </ul>
            </Panel>

            <Panel title={t("topItems")} className="lg:col-span-2">
              <ol className="flex flex-col gap-3">
                {data.topItems.map((r, i) => (
                  <MeterRow
                    key={r.name}
                    rank={i + 1}
                    label={r.name}
                    value={t("sold", { count: r.quantity })}
                    sub={money(r.revenue)}
                    pct={(r.quantity / maxItem) * 100}
                  />
                ))}
              </ol>
            </Panel>
          </div>
          <p className="text-muted-foreground text-xs">{t("note", { currency: store.currency })}</p>
        </>
      )}
    </>
  );
}

/** % change vs the previous period; null when there's nothing to compare with */
function change(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

type T = Awaited<ReturnType<typeof getTranslations<"analytics">>>;

function Kpi({
  label,
  value,
  delta,
  compare,
  sub,
  t,
}: {
  label: string;
  value: string;
  delta?: number | null;
  compare?: string;
  sub?: string;
  t: T;
}) {
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <section className="bg-card flex flex-col gap-1 rounded-xl border p-4">
      <h2 className="text-muted-foreground text-xs font-medium">{label}</h2>
      <p className="text-xl leading-tight font-bold tabular-nums sm:text-2xl">{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      {compare !== undefined && (
        <p
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            delta == null || delta === 0
              ? "text-muted-foreground"
              : delta > 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400",
          )}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {delta == null ? t("noCompare") : `${delta > 0 ? "+" : ""}${delta}% ${compare}`}
        </p>
      )}
    </section>
  );
}

function Panel({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("bg-card flex flex-col gap-4 rounded-xl border p-4", className)}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Label + thin single-hue meter (magnitude), value text in ink colors */
function MeterRow({
  rank,
  label,
  value,
  sub,
  pct,
}: {
  rank?: number;
  label: string;
  value: string;
  sub: string;
  pct: number;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">
          {rank !== undefined && (
            <span className="text-muted-foreground mr-2 tabular-nums">{rank}.</span>
          )}
          <span className="font-medium">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums">
          <span className="font-semibold">{value}</span>
          <span className="text-muted-foreground"> · {sub}</span>
        </span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </li>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-60 w-full" />
    </>
  );
}
