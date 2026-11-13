import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";

import { getCurrentOwner } from "@/lib/auth/owner";
import { JOIN, prisma } from "@/lib/db";
import { csvDateTime, csvResponse, csvToday, toCsv } from "@/lib/export/csv";
import { toMajor } from "@/lib/money";
import { dateFilter, parseTab, searchFilter, TAB_FILTER } from "@/lib/orders/filters";
import { isPro } from "@/lib/plan";

/** Spreadsheet export is a Pro feature; this many rows is plenty for a small shop */
const MAX_ROWS = 10_000;

function optionNames(options: unknown): string {
  if (!Array.isArray(options)) return "";
  return options
    .map((o) => (o && typeof o === "object" && "name" in o ? String(o.name) : ""))
    .filter(Boolean)
    .join(", ");
}

/** GET /admin/export/orders?tab=&q=&date= — the same orders the list shows, as CSV (Pro) */
export async function GET(request: Request) {
  const owner = await getCurrentOwner();
  if (!owner) return new Response("Unauthorized", { status: 401 });
  const { store } = owner;
  if (!isPro(store)) return new Response("Pro plan required", { status: 403 });

  const params = new URL(request.url).searchParams;
  const tab = parseTab(params.get("tab") ?? "all");
  const filters = [
    searchFilter(params.get("q") ?? ""),
    dateFilter(params.get("date") ?? "", store.timeZone),
  ].filter((f): f is Prisma.OrderWhereInput => f !== null);

  const [orders, t] = await Promise.all([
    prisma.order.findMany({
      ...JOIN,
      where: { storeId: store.id, ...TAB_FILTER[tab], AND: filters },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      include: { items: { orderBy: { id: "asc" } } },
    }),
    getTranslations(),
  ]);

  const c = (key: string) => t(`export.orders.${key}`);
  const header = [
    c("number"),
    c("date"),
    c("status"),
    c("type"),
    c("table"),
    c("customer"),
    c("phone"),
    c("email"),
    c("address"),
    c("landmark"),
    c("time"),
    c("items"),
    c("subtotal"),
    c("discount"),
    c("promoCode"),
    c("deliveryFee"),
    c("tip"),
    c("total"),
    c("currency"),
    c("payment"),
    c("paid"),
    c("comment"),
  ];

  const rows = orders.map((o) => {
    const money = (minor: number) => toMajor(minor, o.currency);
    const items = o.items
      .map((i) => {
        const opts = optionNames(i.options);
        return `${i.quantity}× ${i.name}${opts ? ` (${opts})` : ""}`;
      })
      .join("; ");
    return [
      o.number,
      csvDateTime(o.createdAt, store.timeZone),
      t(`status.${o.status}`),
      t(
        o.type === "DINE_IN"
          ? "table.dineIn"
          : o.type === "DELIVERY"
            ? "checkout.delivery"
            : "checkout.pickup",
      ),
      o.tableNumber,
      o.customerName,
      o.customerPhone,
      o.customerEmail,
      o.address,
      o.landmark,
      o.scheduledFor,
      items,
      money(o.subtotal),
      money(o.discount),
      o.promoCode,
      money(o.deliveryFee),
      money(o.tip),
      money(o.total),
      o.currency,
      t(`payment.${o.paymentMethod}`),
      t(`payment.${o.paymentStatus}`),
      o.comment,
    ];
  });

  return csvResponse(toCsv(header, rows), `orders-${store.slug}-${csvToday(store.timeZone)}.csv`);
}
