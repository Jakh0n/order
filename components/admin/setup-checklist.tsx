import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/db";
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

  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("title")}</h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {t("progress", { done: doneCount, total: steps.length })}
        </span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <ol className="flex flex-col">
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
              {!step.done && <ChevronRight className="text-muted-foreground size-4" aria-hidden />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
