import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Lightbulb,
  Lock,
  Minus,
  TrendingDown,
  TrendingUp,
  UserRoundX,
} from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AnalyticsTabs } from "@/components/admin/analytics/analytics-tabs";
import { BarChart } from "@/components/admin/analytics/bar-chart";
import { Heatmap } from "@/components/admin/analytics/heatmap";
import { Sparkline } from "@/components/admin/analytics/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalytics, parsePeriod, PERIODS } from "@/lib/analytics/data";
import { buildInsights, type Insight } from "@/lib/analytics/insights";
import { requireOwner } from "@/lib/auth/owner";
import { LAPSED_DAYS } from "@/lib/customers/data";
import { formatMoney } from "@/lib/money";
import { isPro } from "@/lib/plan";
import { cn } from "@/lib/utils";

export default function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
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
  // Free plan: today only (the other periods are shown locked)
  const pro = isPro(store);
  const period = pro ? parsePeriod(params.period) : "today";
  const [data, t, tp, format] = await Promise.all([
    getAnalytics(store, period),
    getTranslations("analytics"),
    getTranslations("payment"),
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
  const maxMethod = Math.max(...data.money.byMethod.map((r) => r.revenue), 1);
  const empty = current.orders === 0;
  // Per-day series for the KPI sparklines (shown from 7 days)
  const trend = data.days > 1 ? data.byDay : [];
  const avgTrend = trend.map((d) => (d.orders > 0 ? d.revenue / d.orders : 0));
  // Tips need a week of data to mean anything (Free sees "today" only)
  const insights = data.days >= 7 ? buildInsights(data).slice(0, 4) : [];
  const weekdayName = (i: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 1 + i, 12)), { weekday: "long", timeZone: "UTC" });

  return (
    <>
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">{t("description")}</p>
        </div>
        <AnalyticsTabs />
      </div>

      {/* Period — links, so it survives reloads and can be shared */}
      <div
        role="radiogroup"
        aria-label={t("period")}
        className="bg-muted flex w-fit rounded-xl p-1"
      >
        {PERIODS.map((p) =>
          !pro && p !== "today" ? (
            <Link
              key={p}
              href="/admin/plan"
              title={t("lockedPeriod")}
              className="text-muted-foreground/70 hover:text-foreground flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium"
            >
              <Lock className="size-3" aria-hidden />
              {t(`periods.${p}`)}
            </Link>
          ) : (
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
          ),
        )}
      </div>

      {/* KPI tiles — the headline numbers, each compared with the previous period */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label={t("revenue")}
          value={money(current.revenue)}
          delta={change(current.revenue, previous.revenue)}
          compare={t(`vs.${period}`)}
          trend={trend.map((d) => d.revenue)}
          t={t}
        />
        <Kpi
          label={t("orders")}
          value={format.number(current.orders)}
          delta={change(current.orders, previous.orders)}
          compare={t(`vs.${period}`)}
          trend={trend.map((d) => d.orders)}
          t={t}
        />
        <Kpi
          label={t("avgOrder")}
          value={money(avg(current))}
          delta={change(avg(current), avg(previous))}
          compare={t(`vs.${period}`)}
          trend={avgTrend}
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

      {insights.length > 0 && (
        <Panel title={t("insights.title")} icon={Lightbulb}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {insights.map((insight) => (
              <InsightRow key={insight.kind} insight={insight} t={t} weekdayName={weekdayName} />
            ))}
          </ul>
        </Panel>
      )}

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

            <Panel title={t("money.title")} hint={t("money.hint")} className="lg:col-span-2">
              <div className="grid gap-6 sm:grid-cols-2">
                <ul className="flex flex-col gap-3" aria-label={t("money.byMethod")}>
                  {data.money.byMethod.map((r) => (
                    <MeterRow
                      key={r.method}
                      label={tp(r.method)}
                      value={money(r.revenue)}
                      sub={t("ordersCount", { count: r.orders })}
                      pct={(r.revenue / maxMethod) * 100}
                    />
                  ))}
                </ul>
                <dl className="grid grid-cols-[1fr_auto] content-start gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">{t("money.unpaid")}</dt>
                  <dd
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      data.money.unpaid.orders > 0 && "text-red-700 dark:text-red-400",
                    )}
                  >
                    {data.money.unpaid.orders > 0 ? (
                      <Link href="/admin/orders" className="hover:underline">
                        {money(data.money.unpaid.amount)} ·{" "}
                        {t("ordersCount", { count: data.money.unpaid.orders })}
                      </Link>
                    ) : (
                      money(0)
                    )}
                  </dd>
                  <dt className="text-muted-foreground">{t("money.deliveryFees")}</dt>
                  <dd className="text-right tabular-nums">{money(data.money.deliveryFees)}</dd>
                  <dt className="text-muted-foreground">{t("money.discounts")}</dt>
                  <dd className="text-right tabular-nums">
                    {data.money.discounts > 0 ? `−${money(data.money.discounts)}` : money(0)}
                  </dd>
                  <dt className="text-muted-foreground">{t("money.tips")}</dt>
                  <dd className="text-right tabular-nums">{money(data.money.tips)}</dd>
                </dl>
              </div>
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

            {data.days >= 7 && (
              <Panel title={t("heatmap")} hint={t("heatmapHint")} className="lg:col-span-2">
                <Heatmap
                  grid={data.byWeekdayHour}
                  // 2024-01-01 was a Monday
                  weekdays={Array.from({ length: 7 }, (_, i) =>
                    format.dateTime(new Date(Date.UTC(2024, 0, 1 + i, 12)), {
                      weekday: "short",
                      timeZone: "UTC",
                    }),
                  )}
                  caption={t("heatmap")}
                  legendLess={t("legendLess")}
                  legendMore={t("legendMore")}
                />
              </Panel>
            )}
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
  trend,
  t,
}: {
  label: string;
  value: string;
  delta?: number | null;
  compare?: string;
  sub?: string;
  /** One value per day of the period (sparkline) */
  trend?: number[];
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
      {trend && <Sparkline values={trend} className="mt-auto h-7 w-full pt-1" />}
    </section>
  );
}

const INSIGHT_ICON = {
  busiest: Clock,
  rising: TrendingUp,
  falling: TrendingDown,
  lapsed: UserRoundX,
} as const;

function InsightRow({
  insight,
  t,
  weekdayName,
}: {
  insight: Insight;
  t: T;
  weekdayName: (i: number) => string;
}) {
  const Icon = INSIGHT_ICON[insight.kind];
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const text =
    insight.kind === "busiest"
      ? t("insights.busiest", {
          day: weekdayName(insight.weekday),
          time: `${hh(insight.hour)}–${hh((insight.hour + 2) % 24)}`,
          count: insight.orders,
        })
      : insight.kind === "lapsed"
        ? t("insights.lapsed", { count: insight.count, days: LAPSED_DAYS })
        : t(`insights.${insight.kind}`, {
            name: insight.name,
            cur: insight.cur,
            prev: insight.prev,
          });
  const action =
    insight.kind === "lapsed"
      ? { href: "/admin/analytics/customers?sort=lapsed", label: t("insights.lapsedAction") }
      : insight.kind === "falling"
        ? { href: "/admin/promos", label: t("insights.fallingAction") }
        : null;
  return (
    <li className="bg-muted/50 flex gap-3 rounded-lg p-3 text-sm">
      <Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">
        <p>{text}</p>
        {action && (
          <Link
            href={action.href}
            className="text-primary w-fit text-sm font-medium hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
    </li>
  );
}

function Panel({
  title,
  hint,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("bg-card flex flex-col gap-4 rounded-xl border p-4", className)}>
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          {Icon && <Icon className="text-primary size-4" aria-hidden />}
          {title}
        </h2>
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
