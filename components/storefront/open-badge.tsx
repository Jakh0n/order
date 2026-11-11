"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import type { StorefrontStore } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

import { useStoreOpen, useTimeSlots } from "./use-store-open";

/** Yopiq bo'lsa va sabab — ish vaqti, ochilish vaqti; qo'lda yopilgan bo'lsa null */
function opensAtTime(store: StorefrontStore, open: boolean | null) {
  return open === false && store.isOpen && store.openTime && store.closeTime
    ? store.openTime
    : null;
}

/** "● Ochiq · 09:00 – 22:00" yoki "● Yopiq · 09:00 da ochiladi" */
export function OpenStatus({ store }: { store: StorefrontStore }) {
  const t = useTranslations();
  const open = useStoreOpen(store);
  const opensAt = opensAtTime(store, open);
  const hours = store.openTime && store.closeTime ? `${store.openTime} – ${store.closeTime}` : null;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {open !== null && (
        <span
          className={cn(
            "flex items-center gap-1.5 font-medium",
            // Status color is fixed green, never the brand color (a red brand would read as "closed")
            open ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
          )}
        >
          <span
            className={cn("size-2 rounded-full", open ? "bg-emerald-600" : "bg-destructive")}
            aria-hidden
          />
          {open ? t("store.open") : t("store.closed")}
        </span>
      )}
      {(opensAt || hours) && (
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          {opensAt ? t("menu.opensAt", { time: opensAt }) : hours}
        </span>
      )}
    </span>
  );
}

export function ClosedBanner({ store }: { store: StorefrontStore }) {
  const t = useTranslations("menu");
  const open = useStoreOpen(store);
  const canPreorder = useTimeSlots(store).length > 0;
  if (open !== false) return null;
  const opensAt = opensAtTime(store, open);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      {canPreorder && opensAt
        ? t("closedBannerPreorder", { time: opensAt })
        : opensAt
          ? t("closedBannerHours", { time: opensAt })
          : t("closedBanner")}
    </div>
  );
}
