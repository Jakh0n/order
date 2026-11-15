import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { OrderCard } from "@/components/admin/order-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getRequestOrigin } from "@/lib/app-url";
import { requireOwner } from "@/lib/auth/owner";
import { JOIN, prisma } from "@/lib/db";
import { staleNewOrderIds } from "@/lib/orders/status";
import { receiptUrls } from "@/lib/storage";

export const metadata: Metadata = { robots: { index: false } };

/**
 * One order for the store owner — the link in the order message ("For the store") and in push
 * notifications. Customer details, status actions, prints and the invoice. Outside the (panel)
 * layout so a signed-out owner is sent to log in and comes back here.
 */
export default function OwnerOrderPage({ params }: PageProps<"/admin/order/[orderId]">) {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-96" />}>
      <OwnerOrder params={params} />
    </Suspense>
  );
}

async function OwnerOrder({ params }: Pick<PageProps<"/admin/order/[orderId]">, "params">) {
  const { orderId } = await params;
  const { store } = await requireOwner(`/admin/order/${orderId}`);

  const [order, origin, t] = await Promise.all([
    // Only this store's orders: another store's id is simply "not found"
    prisma.order.findFirst({
      ...JOIN,
      where: { id: orderId, storeId: store.id },
      include: { items: { orderBy: { id: "asc" } }, review: { select: { rating: true } } },
    }),
    getRequestOrigin(),
    getTranslations("adminOrders"),
  ]);
  if (!order) notFound();
  const receipt = order.receiptPath
    ? (await receiptUrls([order.receiptPath])).get(order.receiptPath)
    : undefined;
  const tInvoice = await getTranslations("invoice");

  return (
    <div className="bg-muted/50 min-h-dvh">
      <header className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-2">
        <Link
          href="/admin/orders"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1.5" })}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("orderPage.back")}
        </Link>
        <span className="text-muted-foreground ml-auto truncate text-sm">{store.name}</span>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
        <h1 className="sr-only">{t("orderPage.title", { number: order.number })}</h1>
        <OrderCard
          order={order}
          timeZone={store.timeZone}
          storeName={store.name}
          channel={store.channel}
          stale={staleNewOrderIds([order]).has(order.id)}
          receiptUrl={receipt}
          origin={origin}
        />
        <Link
          href={`/admin/invoice/${order.id}`}
          target="_blank"
          className={buttonVariants({ variant: "outline", className: "gap-2" })}
        >
          <FileText className="size-4" aria-hidden />
          {tInvoice("button")}
        </Link>
      </main>
    </div>
  );
}
