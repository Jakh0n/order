import { Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { TableCard } from "@/components/admin/qr/table-card";
import { tableCardText } from "@/components/admin/qr/table-card-text";
import { TableSettingsForm } from "@/components/admin/qr/table-settings-form";
import { StoreLink } from "@/components/admin/settings/store-link";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRequestOrigin } from "@/lib/app-url";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { isPro } from "@/lib/plan";
import { buildTableQrs } from "@/lib/table-qr";

/** QR codes: the store link for Instagram / flyers, and one code per table */
export default function AdminQrPage() {
  return (
    <Suspense fallback={<QrSkeleton />}>
      <AdminQr />
    </Suspense>
  );
}

async function AdminQr() {
  const { store } = await requireOwner();
  const [settings, origin, t, tAdmin] = await Promise.all([
    prisma.store.findUnique({
      where: { id: store.id },
      select: { name: true, slug: true, logoUrl: true, dineInEnabled: true, tableCount: true },
    }),
    getRequestOrigin(),
    getTranslations("table"),
    getTranslations("admin"),
  ]);
  if (!settings) notFound();

  const showTables = settings.dineInEnabled && settings.tableCount > 0;
  const tables = showTables ? await buildTableQrs(origin, settings.slug, settings.tableCount) : [];

  const cardText = tableCardText(t);
  // Free plan shows the platform address on the card; Pro removes it
  const footer = isPro(store) ? undefined : new URL(origin).host;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tAdmin("qr")}</h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">
          {tAdmin("descriptions.dineIn")}
        </p>
      </div>

      <StoreLink slug={settings.slug} origin={origin} />

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">{t("section")}</h2>
          <p className="text-muted-foreground text-xs">{t("sectionHint")}</p>
        </div>
        <TableSettingsForm
          dineInEnabled={settings.dineInEnabled}
          tableCount={settings.tableCount}
        />
      </section>

      {showTables && (
        <section className="bg-card flex flex-col gap-4 rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{t("cardsTitle")}</h2>
              <p className="text-muted-foreground text-xs">
                {t("printHint", { count: settings.tableCount })}
              </p>
            </div>
            <Link
              href="/admin/tables"
              target="_blank"
              className={buttonVariants({ className: "gap-2" })}
            >
              <Printer className="size-4" aria-hidden />
              {t("print")}
            </Link>
          </div>
          <div className="bg-muted/50 grid grid-cols-2 gap-3 rounded-lg p-3 sm:grid-cols-3">
            {tables.map((table) => (
              <TableCard
                key={table.number}
                table={table}
                store={settings}
                text={cardText}
                footer={footer}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QrSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
