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
import { buildTableQrs } from "@/lib/table-qr";

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
  const footer = new URL(origin).host;

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
          <Link href="/admin/qr" className={buttonVariants({ variant: "ghost" })}>
            {t("backToQr")}
          </Link>
          <PrintButton label={t("print")} />
        </div>
      </header>

      {/* A4 without browser margins: 2 × 2 cards per page, cut along the dashed lines */}
      <style>{`@page { size: A4; margin: 0; }`}</style>
      <main className="mx-auto grid max-w-[210mm] grid-cols-1 gap-5 p-4 sm:grid-cols-2 print:w-[210mm] print:max-w-none print:grid-cols-2 print:gap-0 print:p-0">
        {tables.map((table) => (
          <TableCard
            key={table.number}
            table={table}
            store={settings}
            text={cardText}
            footer={footer}
          />
        ))}
      </main>
    </div>
  );
}
