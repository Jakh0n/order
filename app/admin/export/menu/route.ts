import { getCurrentOwner } from "@/lib/auth/owner";
import { JOIN, prisma } from "@/lib/db";
import { csvResponse, csvToday, toCsv } from "@/lib/export/csv";
import { formatOptions, MENU_CSV_HEADER } from "@/lib/menu/csv";
import { currencyDigits, toMajor } from "@/lib/money";
import { isPro } from "@/lib/plan";

/**
 * GET /admin/export/menu — the whole menu as CSV in the import format (Pro).
 * GET /admin/export/menu?template=1 — an example file to fill in (any plan).
 */
export async function GET(request: Request) {
  const owner = await getCurrentOwner();
  if (!owner) return new Response("Unauthorized", { status: 401 });
  const { store } = owner;

  if (new URL(request.url).searchParams.has("template")) {
    // Example prices that look normal in the store's currency (25000 so'm vs 8.99 dollars)
    const [main, extra] = currencyDigits(store.currency) === 0 ? [25000, 5000] : [8.99, 1.5];
    const rows = [
      [
        "Burgers",
        "Cheeseburger",
        "Beef patty, cheddar, pickles",
        main,
        `Size*=Regular:0|Large:${extra}; Extras=Bacon:${extra}|Cheese:${extra}`,
      ],
      ["Burgers", "Chicken burger", "", main, ""],
      ["Drinks", "Lemonade", "", extra, ""],
    ];
    return csvResponse(toCsv([...MENU_CSV_HEADER], rows), "menu-template.csv");
  }

  if (!isPro(store)) return new Response("Pro plan required", { status: 403 });

  const categories = await prisma.category.findMany({
    ...JOIN,
    where: { storeId: store.id },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: {
      name: true,
      products: {
        orderBy: [{ sort: "asc" }, { name: "asc" }],
        select: {
          name: true,
          description: true,
          price: true,
          optionGroups: {
            orderBy: { sort: "asc" },
            select: {
              name: true,
              required: true,
              options: { orderBy: { sort: "asc" }, select: { name: true, price: true } },
            },
          },
        },
      },
    },
  });

  const money = (minor: number) => toMajor(minor, store.currency);
  const rows = categories.flatMap((c) =>
    c.products.map((p) => [
      c.name,
      p.name,
      p.description,
      money(p.price),
      formatOptions(
        p.optionGroups.map((g) => ({
          name: g.name,
          required: g.required,
          options: g.options.map((o) => ({ name: o.name, price: money(o.price) })),
        })),
      ),
    ]),
  );

  return csvResponse(
    toCsv([...MENU_CSV_HEADER], rows),
    `menu-${store.slug}-${csvToday(store.timeZone)}.csv`,
  );
}
