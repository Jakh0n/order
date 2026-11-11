import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { Suspense } from "react";

import { PrintButton } from "@/components/admin/print-button";
import { buttonVariants } from "@/components/ui/button";
import { getRequestOrigin } from "@/lib/app-url";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { tableLink } from "@/lib/table-session-link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

// Outside the (panel) layout on purpose: a clean page that prints as table cards only.
export default function TablesPrintPage() {
  return (
    <Suspense>
      <TableCards />
    </Suspense>
  );
}

async function TableCards() {
  const { store } = await requireOwner();
  const [settings, origin, t] = await Promise.all([
    prisma.store.findUnique({
      where: { id: store.id },
      select: { name: true, slug: true, dineInEnabled: true, tableCount: true },
    }),
    getRequestOrigin(),
    getTranslations("table"),
  ]);

  if (!settings?.dineInEnabled || settings.tableCount < 1) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20 text-center">
        <p className="text-muted-foreground">{t("printDisabled")}</p>
        <Link href="/admin/settings" className={buttonVariants({ variant: "outline" })}>
          {t("openSettings")}
        </Link>
      </div>
    );
  }

  const base = origin.replace(/\/$/, "");
  const tables = await Promise.all(
    Array.from({ length: settings.tableCount }, async (_, i) => {
      const number = i + 1;
      const url = tableLink(base, settings.slug, number);
      const svg = await QRCode.toString(url, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" },
      });
      return { number, url, svg };
    }),
  );

  return (
    <div className="bg-muted/40 min-h-full print:bg-white">
      <header className="bg-background sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 print:hidden">
        <div>
          <h1 className="font-bold">{t("printTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("printHint", { count: settings.tableCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/settings" className={buttonVariants({ variant: "ghost" })}>
            {t("openSettings")}
          </Link>
          <PrintButton label={t("print")} />
        </div>
      </header>

      {/* A4: 2 × 3 cards per page; each card is cut out and stands on a table */}
      <main className="mx-auto grid max-w-[210mm] grid-cols-1 gap-4 p-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0 print:p-0">
        {tables.map((table) => (
          <article
            key={table.number}
            className={cn(
              "bg-background flex flex-col items-center gap-3 rounded-2xl border p-6 text-center",
              "break-inside-avoid print:h-[99mm] print:justify-center print:rounded-none print:border-dashed print:p-[8mm]",
            )}
          >
            <p className="text-muted-foreground max-w-full truncate text-sm font-medium">
              {settings.name}
            </p>
            <p className="text-3xl leading-none font-extrabold tracking-tight">
              {t("label", { number: table.number })}
            </p>
            <div
              className="size-40 print:size-[52mm] [&>svg]:size-full"
              role="img"
              aria-label={table.url}
              // Generated locally by the qrcode package from our own URL
              dangerouslySetInnerHTML={{ __html: table.svg }}
            />
            <p className="text-sm font-semibold">{t("scanToOrder")}</p>
          </article>
        ))}
      </main>
    </div>
  );
}
