"use client";

import { Armchair, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import type { StorefrontStore } from "@/lib/menu-types";
import { setTable, TABLE_PARAM, useTable } from "@/lib/table-session";

/** Valid table from the store's settings, or null */
export function validTable(
  store: Pick<StorefrontStore, "dineInEnabled" | "tableCount">,
  table: number | null,
): number | null {
  if (!store.dineInEnabled || !table) return null;
  return table >= 1 && table <= store.tableCount ? table : null;
}

/**
 * Table QR (/{slug}?t=5): remembers the table and shows "Table 5" on the menu.
 * The customer can say they're not at a table (then it's a normal pickup/delivery order).
 */
export function TableBanner({ store }: { store: StorefrontStore }) {
  const t = useTranslations("table");
  const table = validTable(store, useTable(store.slug));

  // Read ?t= once on load (no useSearchParams: the menu page stays static/cached)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get(TABLE_PARAM);
    if (param === null) return;
    const scanned = validTable(store, Number.parseInt(param, 10));
    if (scanned) setTable(store.slug, scanned);
  }, [store]);

  if (!table) return null;

  return (
    <div className="border-primary/20 bg-primary/5 flex items-center gap-3 rounded-2xl border px-3 py-2.5">
      <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Armchair className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t("label", { number: table })}</p>
        <p className="text-muted-foreground text-xs">{t("bannerHint")}</p>
      </div>
      <button
        type="button"
        onClick={() => setTable(store.slug, null)}
        className="text-muted-foreground hover:text-foreground hover:bg-background flex min-h-9 items-center gap-1 rounded-full px-2.5 text-xs font-medium"
      >
        <X className="size-3.5" aria-hidden />
        {t("notAtTable")}
      </button>
    </div>
  );
}
