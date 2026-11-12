import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Onboarding for a new store: what's left before the first real order.
 * Hidden once everything is done.
 */
export async function SetupChecklist({ storeId, slug }: { storeId: string; slug: string }) {
  const [t, store, categories, products, orders, devices] = await Promise.all([
    getTranslations("setup"),
    prisma.store.findUnique({
      where: { id: storeId },
      select: {
        openTime: true,
        closeTime: true,
        channel: true,
        telegramUsername: true,
        whatsappNumber: true,
      },
    }),
    prisma.category.count({ where: { storeId } }),
    prisma.product.count({ where: { storeId } }),
    prisma.order.count({ where: { storeId } }),
    prisma.pushSubscription.count({ where: { storeId } }),
  ]);
  if (!store) return null;

  const steps = [
    { key: "category", done: categories > 0, href: "/admin/menu" },
    // No dishes yet → the AI import is the fastest way to fill the menu
    {
      key: "products",
      done: products >= 3,
      href: products === 0 ? "/admin/menu/import" : "/admin/menu",
    },
    { key: "hours", done: !!(store.openTime && store.closeTime), href: "/admin/settings" },
    {
      key: "channel",
      done: store.channel === "TELEGRAM" ? !!store.telegramUsername : !!store.whatsappNumber,
      href: "/admin/settings",
    },
    // Push on at least one device — the owner hears about orders with the tab closed
    { key: "notifications", done: devices > 0, href: "/admin/orders#push" },
    { key: "testOrder", done: orders > 0, href: `/${slug}`, external: true },
  ] as const;
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const next = steps.find((s) => !s.done)!;
  const pct = Math.round((doneCount / steps.length) * 100);

  // Compact: progress + the next step; the full list opens on demand (native <details>)
  return (
    <section className="bg-card rounded-xl border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <div
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0deg)`,
          }}
          role="img"
          aria-label={t("progress", { done: doneCount, total: steps.length })}
        >
          <span className="bg-card flex size-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
            {doneCount}/{steps.length}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-muted-foreground truncate text-sm">
            {t("next")}: {t(next.key)}
          </p>
        </div>
        <Link
          href={next.href}
          target={"external" in next ? "_blank" : undefined}
          className={buttonVariants({ size: "sm", className: "gap-1" })}
        >
          {t("continue")}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <details className="group border-t">
        <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 px-4 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          {t("showAll")}
        </summary>
        <ol className="flex flex-col px-4 pb-3">
          {steps.map((step) => (
            <li key={step.key}>
              <Link
                href={step.href}
                target={"external" in step ? "_blank" : undefined}
                className="hover:bg-muted -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm"
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    step.done && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {step.done && <Check className="size-3.5" aria-hidden />}
                </span>
                <span className={cn("flex-1", step.done && "text-muted-foreground line-through")}>
                  {t(step.key)}
                  {step.done && <span className="sr-only"> — {t("done")}</span>}
                </span>
                {!step.done && (
                  <ChevronRight className="text-muted-foreground size-4" aria-hidden />
                )}
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
