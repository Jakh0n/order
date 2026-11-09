"use client";

import { ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { parseLastOrder, readLastOrderRaw } from "@/lib/last-order";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** "Your order #12 — Track" for a returning customer (this browser only) */
export function LastOrderBanner({ slug }: { slug: string }) {
  const t = useTranslations("menu");
  const raw = useSyncExternalStore(
    subscribe,
    () => readLastOrderRaw(slug),
    () => null,
  );
  const order = parseLastOrder(raw);
  if (!order) return null;

  return (
    <Link
      href={`/o/${order.id}`}
      className="bg-primary/5 hover:bg-primary/10 flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
    >
      <Receipt className="text-primary size-4 shrink-0" aria-hidden />
      <span className="flex-1">{t("lastOrder", { number: order.number })}</span>
      <span className="text-primary flex items-center font-medium">
        {t("trackOrder")}
        <ChevronRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
