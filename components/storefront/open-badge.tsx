"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { StorefrontStore } from "@/lib/menu-types";

import { useStoreOpen } from "./use-store-open";

export function OpenBadge({ store }: { store: StorefrontStore }) {
  const t = useTranslations("store");
  const open = useStoreOpen(store);
  if (open === null) return null;
  return (
    <Badge
      variant={open ? "default" : "secondary"}
      className={open ? "bg-emerald-600 text-white dark:bg-emerald-500" : undefined}
    >
      {open ? t("open") : t("closed")}
    </Badge>
  );
}

export function ClosedBanner({ store }: { store: StorefrontStore }) {
  const t = useTranslations("menu");
  const open = useStoreOpen(store);
  if (open !== false) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      {t("closedBanner")}
    </div>
  );
}
