// Demo store "Flami Grill" (USD). Safe to re-run: the menu and zones are recreated,
// existing product photos are kept by item name, orders and the owner's password are untouched.
import { PrismaClient } from "@prisma/client";

import { FLAMI_MENU, FLAMI_ZONES } from "./flami-menu";

const prisma = new PrismaClient();

async function main() {
  // Owner without a password — set one with: npm run user:password -- admin@flami.org
  const owner = await prisma.user.upsert({
    where: { email: "admin@flami.org" },
    update: {},
    create: { email: "admin@flami.org", name: "Flami admin", role: "SUPERADMIN" },
  });

  const storeData = {
    name: "Flami Grill",
    address: "Downtown (test store)",
    landmark: "Next to the central station",
    currency: "USD",
    timeZone: "UTC",
    openTime: null,
    closeTime: null,
    isOpen: true,
    pickupEnabled: true,
    deliveryEnabled: true,
    minOrder: 1500,
    acceptCash: true,
    acceptCardOnDelivery: true,
    acceptTransfer: true,
    transferDetails:
      "TEST bank details:\nAccount name: Flami Grill Ltd\nIBAN: GB00 TEST 0000 0000 0000 00\nBank: Test Bank",
  };

  const store = await prisma.store.upsert({
    where: { slug: "flami-grill" },
    update: storeData,
    create: {
      ...storeData,
      slug: "flami-grill",
      ownerId: owner.id,
      telegramUsername: "flami_grill",
    },
  });

  // Keep uploaded photos by item name
  const photos = new Map(
    (
      await prisma.product.findMany({
        where: { storeId: store.id },
        select: { name: true, imageUrl: true },
      })
    )
      .filter((p) => p.imageUrl)
      .map((p) => [p.name, p.imageUrl]),
  );

  await prisma.product.deleteMany({ where: { storeId: store.id } }); // option groups cascade
  await prisma.category.deleteMany({ where: { storeId: store.id } });
  await prisma.deliveryZone.deleteMany({ where: { storeId: store.id } });

  for (const [cSort, cat] of FLAMI_MENU.entries()) {
    const category = await prisma.category.create({
      data: { storeId: store.id, name: cat.category, sort: cSort },
    });
    for (const [pSort, item] of cat.items.entries()) {
      await prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: photos.get(item.name) ?? null,
          sort: pSort,
          optionGroups: {
            create: (item.groups ?? []).map((g, gSort) => ({
              name: g.name,
              required: g.required,
              maxSelect: g.maxSelect,
              sort: gSort,
              options: {
                create: g.options.map(([name, price], oSort) => ({ name, price, sort: oSort })),
              },
            })),
          },
        },
      });
    }
  }

  await prisma.deliveryZone.createMany({
    data: FLAMI_ZONES.map(([name, fee], sort) => ({ storeId: store.id, name, fee, sort })),
  });

  console.log(
    `Seed done: /${store.slug} — ${FLAMI_MENU.length} categories, ${photos.size} photos kept`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
