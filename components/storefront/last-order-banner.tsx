"use client";

import { ChevronRight, Receipt, Star, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { parseLastOrder, readLastOrderRaw } from "@/lib/last-order";
import { shouldAskForReview } from "@/lib/reviews/prompt-actions";

const dismissKey = (orderId: string) => `review-ask-off:${orderId}`;

function isDismissed(orderId: string) {
  try {
    return localStorage.getItem(dismissKey(orderId)) === "1";
  } catch {
    return false;
  }
}

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
  const orderId = order?.id;
  // Completed and not rated yet → ask for a rating instead of "Track"
  const [askRating, setAskRating] = useState(false);

  useEffect(() => {
    if (!orderId || isDismissed(orderId)) return;
    let cancelled = false;
    void shouldAskForReview(orderId, slug).then((yes) => {
      if (!cancelled) setAskRating(yes);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, slug]);

  if (!order) return null;

  if (askRating) {
    return (
      <div className="flex min-h-11 items-center gap-1 rounded-xl bg-amber-50 py-1 pr-1 pl-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
        <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
        <Link href={`/o/${order.id}#review`} className="flex flex-1 items-center gap-2 py-1.5">
          <span className="flex-1">{t("rateOrder", { number: order.number })}</span>
          <span className="flex items-center font-semibold">
            {t("rateNow")}
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </Link>
        <button
          type="button"
          aria-label={t("dismissRate")}
          onClick={() => {
            try {
              localStorage.setItem(dismissKey(order.id), "1");
            } catch {
              // ignore
            }
            setAskRating(false);
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

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
