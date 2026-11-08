import { Phone, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { AutoRefresh } from "@/components/order/auto-refresh";
import { StatusSteps } from "@/components/order/status-steps";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatUZS } from "@/lib/money";
import { type CustomerOrder, getOrderForCustomer } from "@/lib/orders/get-order";
import { orderSendLink } from "@/lib/orders/send-link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

export default function OrderPage({ params }: PageProps<"/o/[orderId]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: { params: PageProps<"/o/[orderId]">["params"] }) {
  const { orderId } = await params;
  const order = await getOrderForCustomer(orderId);
  if (!order) notFound();

  const t = await getTranslations();
  const format = await getFormatter();
  const send = orderSendLink(order, order.store);
  const isFinal = order.status === "COMPLETED" || order.status === "CANCELLED";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <title>{t("order.title", { number: order.number })}</title>

      <header className="flex items-start justify-between gap-3 border-b px-4 py-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{order.store.name}</p>
          <h1 className="text-2xl font-bold">{t("order.title", { number: order.number })}</h1>
          <p className="text-muted-foreground text-sm">
            {format.dateTime(order.createdAt, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <LanguageSwitcher />
      </header>

      {order.status === "NEW" && send && (
        <section className="bg-primary/5 flex flex-col gap-3 border-b px-4 py-5">
          <div>
            <p className="font-semibold">{t("order.sendTitle")}</p>
            <p className="text-muted-foreground text-sm">{t("order.sendHint")}</p>
          </div>
          <a
            href={send.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 text-base text-white",
              send.channel === "TELEGRAM"
                ? "bg-[#229ED9] hover:bg-[#1d8cc2]"
                : "bg-[#25D366] hover:bg-[#1fb857]",
            )}
          >
            <Send />
            {send.channel === "TELEGRAM" ? t("order.sendTelegram") : t("order.sendWhatsapp")}
          </a>
        </section>
      )}

      <Section title={t("order.status")}>
        <StatusSteps status={order.status} type={order.type} />
        {!isFinal && <p className="text-muted-foreground text-xs">{t("order.autoRefresh")}</p>}
      </Section>

      <Section title={t("order.items")}>
        <ul className="flex flex-col gap-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                {item.quantity} × {item.name}
                {optionNames(item.options) && (
                  <span className="text-muted-foreground block text-xs">
                    {optionNames(item.options)}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">{formatUZS(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t pt-3 text-sm">
          <Row label={t("checkout.subtotal")} value={formatUZS(order.subtotal)} />
          {order.type === "DELIVERY" && (
            <Row label={t("checkout.deliveryFee")} value={formatUZS(order.deliveryFee)} />
          )}
          <Row label={t("checkout.total")} value={formatUZS(order.total)} strong />
        </dl>
      </Section>

      <Section title={t("order.details")}>
        <dl className="flex flex-col gap-2 text-sm">
          <Row
            label={t("checkout.type")}
            value={order.type === "DELIVERY" ? t("checkout.delivery") : t("checkout.pickup")}
          />
          {order.zoneName && <Row label={t("checkout.zone")} value={order.zoneName} />}
          {order.address && <Row label={t("checkout.address")} value={order.address} />}
          {order.landmark && <Row label={t("checkout.landmark")} value={order.landmark} />}
          <Row label={t("checkout.time")} value={order.scheduledFor ?? t("checkout.asap")} />
          {order.comment && <Row label={t("checkout.comment")} value={order.comment} />}
          <Row label={t("checkout.name")} value={order.customerName} />
          <Row label={t("checkout.phone")} value={order.customerPhone} />
        </dl>
      </Section>

      <Section title={t("order.payment")}>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>{t(`payment.${order.paymentMethod}`)}</span>
          <Badge variant={order.paymentStatus === "PAID" ? "default" : "secondary"}>
            {t(`payment.${order.paymentStatus}`)}
          </Badge>
        </div>
        <TransferDetails order={order} label={t("checkout.transferDetails")} />
      </Section>

      <div className="flex flex-col gap-2 px-4 py-5">
        {order.store.phone && (
          <a
            href={`tel:${order.store.phone.replace(/\s/g, "")}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Phone />
            {t("order.callStore")}
          </a>
        )}
        <Link href={`/${order.store.slug}`} className={buttonVariants({ variant: "ghost" })}>
          {t("order.backToMenu")}
        </Link>
      </div>

      {!isFinal && <AutoRefresh />}
    </div>
  );
}

function TransferDetails({ order, label }: { order: CustomerOrder; label: string }) {
  if (order.paymentMethod !== "TRANSFER" || order.paymentStatus === "PAID") return null;
  if (!order.store.transferDetails) return null;
  return (
    <div className="bg-muted rounded-lg p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="mt-1 whitespace-pre-line">{order.store.transferDetails}</p>
    </div>
  );
}

function optionNames(options: unknown): string | null {
  if (!Array.isArray(options)) return null;
  const names = options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : null))
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b px-4 py-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "text-base font-semibold")}>
      <dt className={strong ? undefined : "text-muted-foreground shrink-0"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
