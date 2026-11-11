import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PrintButton } from "@/components/admin/print-button";
import { TableCard } from "@/components/admin/qr/table-card";
import { tableCardText } from "@/components/admin/qr/table-card-text";
import { buttonVariants } from "@/components/ui/button";
import { getRequestOrigin } from "@/lib/app-url";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { isPro } from "@/lib/plan";
import { buildTableQrs } from "@/lib/table-qr";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Print sizes. The card is sized in container units, so only the cell changes.
 * Class strings are written out in full (Tailwind only sees literal class names).
 */
const SIZES = {
  // 10 × 15 cm — 4 per A4 portrait
  a6: {
    page: "A4 portrait",
    grid: "max-w-[210mm] sm:grid-cols-2 print:w-[210mm] print:grid-cols-2",
    cell: "print:h-[148mm] print:p-[6mm]",
  },
  // 15 × 21 cm — 2 per A4 landscape (the usual table stand size)
  a5: {
    page: "A4 landscape",
    grid: "max-w-[297mm] sm:grid-cols-2 print:w-[297mm] print:grid-cols-2",
    cell: "print:h-[209mm] print:p-[9mm]",
  },
  // 21 × 30 cm — 1 per A4 portrait (wall, counter, entrance)
  a4: {
    page: "A4 portrait",
    grid: "max-w-[210mm] print:w-[210mm] print:grid-cols-1",
    cell: "print:h-[296mm] print:p-[12mm]",
  },
} as const;
type PrintSize = keyof typeof SIZES;
const DEFAULT_SIZE: PrintSize = "a5";

// Outside the (panel) layout on purpose: a clean page that prints as table cards only.
export default function TablesPrintPage({ searchParams }: PageProps<"/admin/tables">) {
  return (
    <Suspense>
      <TableCards searchParams={searchParams} />
    </Suspense>
  );
}

async function TableCards({ searchParams }: Pick<PageProps<"/admin/tables">, "searchParams">) {
  const [{ store }, params] = await Promise.all([requireOwner(), searchParams]);
  const size: PrintSize =
    typeof params.size === "string" && params.size in SIZES
      ? (params.size as PrintSize)
      : DEFAULT_SIZE;
  const layout = SIZES[size];
  const [settings, origin, t] = await Promise.all([
    prisma.store.findUnique({
      where: { id: store.id },
      select: { name: true, slug: true, logoUrl: true, dineInEnabled: true, tableCount: true },
    }),
    getRequestOrigin(),
    getTranslations("table"),
  ]);

  if (!settings?.dineInEnabled || settings.tableCount < 1) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20 text-center">
        <p className="text-muted-foreground">{t("printDisabled")}</p>
        <Link href="/admin/qr" className={buttonVariants({ variant: "outline" })}>
          {t("backToQr")}
        </Link>
      </div>
    );
  }

  const tables = await buildTableQrs(origin, settings.slug, settings.tableCount);
  const cardText = tableCardText(t);
  // Free plan shows the platform address on the card; Pro removes it
  const footer = isPro(store) ? undefined : new URL(origin).host;

  return (
    <div className="bg-muted/40 min-h-full print:bg-white">
      <header className="bg-background sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 print:hidden">
        <div>
          <h1 className="font-bold">{t("printTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("printHint", { count: settings.tableCount })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Size: links, so the choice survives a reload and the print dialog */}
          <div
            role="radiogroup"
            aria-label={t("size.label")}
            className="bg-muted flex rounded-xl p-1"
          >
            {(Object.keys(SIZES) as PrintSize[]).map((key) => (
              <Link
                key={key}
                href={`/admin/tables?size=${key}`}
                replace
                role="radio"
                aria-checked={key === size}
                className={cn(
                  "flex flex-col rounded-lg px-3 py-1.5 text-left leading-tight transition-colors",
                  key === size
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="text-sm font-semibold">{t(`size.${key}`)}</span>
                <span className="text-[11px]">{t(`size.${key}Hint`)}</span>
              </Link>
            ))}
          </div>
          <Link href="/admin/qr" className={buttonVariants({ variant: "ghost" })}>
            {t("backToQr")}
          </Link>
          <PrintButton label={t("print")} />
        </div>
      </header>

      {/* No browser margins; cards are cut along the dashed lines */}
      <style>{`@page { size: ${layout.page}; margin: 0; }`}</style>
      <p className="text-muted-foreground mx-auto max-w-2xl px-4 pt-4 text-center text-sm print:hidden">
        {t("size.standHint")}
      </p>
      <main
        className={cn(
          "mx-auto grid grid-cols-1 gap-5 p-4 print:max-w-none print:gap-0 print:p-0",
          layout.grid,
        )}
      >
        {tables.map((table) => (
          <TableCard
            key={table.number}
            table={table}
            store={settings}
            text={cardText}
            footer={footer}
            cellClassName={layout.cell}
          />
        ))}
      </main>
    </div>
  );
}
