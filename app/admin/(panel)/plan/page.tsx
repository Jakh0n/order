import { Check, Gem, Send } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import {
  FOUNDING_PRO_MONTHS,
  FOUNDING_STORES,
  FREE_MONTHLY_ORDERS,
  planOf,
  PRO_PRICE_USD,
  PRO_PRICE_YEARLY_USD,
  upgradeLink,
} from "@/lib/plan";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "f.orders",
  "f.menu",
  "f.chat",
  "f.tables",
  "f.print",
  "f.today",
  "f.history",
] as const;
const PRO_FEATURES = [
  "p.history",
  "p.promos",
  "p.freeDelivery",
  "p.analytics",
  "p.customers",
  "p.branding",
] as const;

export default function PlanPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Plan />
      </Suspense>
    </div>
  );
}

async function Plan() {
  const { store } = await requireOwner();
  const [t, format] = await Promise.all([getTranslations("plan"), getFormatter()]);
  const tier = planOf(store);
  const pro = tier === "PRO";
  const until = store.paidUntil
    ? format.dateTime(store.paidUntil, { dateStyle: "medium", timeZone: store.timeZone })
    : null;
  const expired = store.plan === "PAID" && !pro;
  const contact = upgradeLink(t(pro ? "renewMessage" : "upgradeMessage", { store: store.name }));

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">{t("lead")}</p>
      </div>

      {/* Current plan */}
      <section className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            pro ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Gem className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">{t("current")}</p>
          <p className="font-bold">
            {pro ? t("proName") : t("freeName")}
            {pro && (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {until ? t("until", { date: until }) : t("noEnd")}
              </span>
            )}
          </p>
          {expired && until && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t("expired", { date: until })}
            </p>
          )}
        </div>
      </section>

      {/* Free vs Pro */}
      <div className="grid gap-3 md:grid-cols-2">
        <PlanColumn
          name={t("freeName")}
          price="$0"
          per={t("forever")}
          intro={t("freeIntro")}
          features={FREE_FEATURES.map((k) => t(k, { limit: FREE_MONTHLY_ORDERS }))}
          current={!pro}
          currentLabel={t("yourPlan")}
        />
        <PlanColumn
          highlight
          name={t("proName")}
          price={`$${PRO_PRICE_USD}`}
          per={t("perMonth")}
          note={t("perYear", { price: `$${PRO_PRICE_YEARLY_USD}` })}
          intro={t("proIntro")}
          features={PRO_FEATURES.map((k) => t(k))}
          current={pro}
          currentLabel={t("yourPlan")}
        >
          {!pro && (
            <p className="bg-primary/10 rounded-lg px-3 py-2 text-sm">
              {t("founding", { count: FOUNDING_STORES, months: FOUNDING_PRO_MONTHS })}
            </p>
          )}
          {contact ? (
            <a
              href={contact}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "lg", className: "w-full gap-2" })}
            >
              <Send className="size-4" aria-hidden />
              {pro ? t("renew") : t("upgrade")}
            </a>
          ) : (
            <p className="text-muted-foreground text-sm">{t("contactSoon")}</p>
          )}
          <p className="text-muted-foreground text-center text-xs">{t("howToPay")}</p>
        </PlanColumn>
      </div>

      <p className="text-muted-foreground text-xs">{t("neverLimit")}</p>
    </>
  );
}

function PlanColumn({
  name,
  price,
  per,
  note,
  intro,
  features,
  current,
  currentLabel,
  highlight,
  children,
}: {
  name: string;
  price: string;
  per: string;
  note?: string;
  intro: string;
  features: string[];
  current: boolean;
  currentLabel: string;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-card relative flex flex-col gap-4 rounded-2xl border p-5",
        highlight && "border-primary/40 ring-primary/10 ring-4",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{name}</h2>
        {current && (
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {currentLabel}
          </span>
        )}
      </div>
      <p>
        <span className="text-3xl font-black tracking-tight">{price}</span>
        <span className="text-muted-foreground text-sm"> {per}</span>
        {note && <span className="text-muted-foreground block text-xs">{note}</span>}
      </p>
      <p className="text-muted-foreground text-sm">{intro}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      {children && <div className="mt-auto flex flex-col gap-2 pt-2">{children}</div>}
    </section>
  );
}
