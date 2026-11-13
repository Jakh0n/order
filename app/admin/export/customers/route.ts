import { getTranslations } from "next-intl/server";

import { getCurrentOwner } from "@/lib/auth/owner";
import { CUSTOMER_SORTS, type CustomerSort, listCustomers } from "@/lib/customers/data";
import { csvDateTime, csvResponse, csvToday, toCsv } from "@/lib/export/csv";
import { toMajor } from "@/lib/money";
import { isPro } from "@/lib/plan";

/** GET /admin/export/customers?q=&sort= — the customer base as CSV (Pro) */
export async function GET(request: Request) {
  const owner = await getCurrentOwner();
  if (!owner) return new Response("Unauthorized", { status: 401 });
  const { store } = owner;
  if (!isPro(store)) return new Response("Pro plan required", { status: 403 });

  const params = new URL(request.url).searchParams;
  const sortParam = params.get("sort");
  const sort: CustomerSort = CUSTOMER_SORTS.includes(sortParam as CustomerSort)
    ? (sortParam as CustomerSort)
    : "recent";

  const [{ customers }, t] = await Promise.all([
    listCustomers(store, { q: params.get("q") ?? "", sort, limit: 10_000 }),
    getTranslations("export.customers"),
  ]);

  const header = [
    t("name"),
    t("phone"),
    t("orders"),
    t("spent", { currency: store.currency }),
    t("first"),
    t("last"),
  ];
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.orders,
    toMajor(c.spent, store.currency),
    csvDateTime(c.firstAt, store.timeZone),
    csvDateTime(c.lastAt, store.timeZone),
  ]);

  return csvResponse(
    toCsv(header, rows),
    `customers-${store.slug}-${csvToday(store.timeZone)}.csv`,
  );
}
