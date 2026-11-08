import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "owner@order.uz" },
    update: {},
    create: { email: "owner@order.uz", name: "Owner", role: "OWNER" },
  });

  const storeData = {
    name: "Mening oshxonam",
    openTime: "09:00",
    closeTime: "22:00",
    channel: "TELEGRAM" as const,
    telegramUsername: "my_oshxona",
    minOrder: 50000,
  };

  const store = await prisma.store.upsert({
    where: { slug: "oshxonam" },
    update: storeData,
    create: { ...storeData, slug: "oshxonam", ownerId: owner.id },
  });

  // Menyu va tumanlarni qayta yaratamiz. Buyurtmalarga tegilmaydi:
  // OrderItem'da nom va narx snapshot, productId esa FK emas.
  await prisma.product.deleteMany({ where: { storeId: store.id } });
  await prisma.category.deleteMany({ where: { storeId: store.id } });
  await prisma.deliveryZone.deleteMany({ where: { storeId: store.id } });

  const [milliy, salatlar, ichimliklar] = await Promise.all(
    ["Milliy taomlar", "Salatlar", "Ichimliklar"].map((name, sort) =>
      prisma.category.create({ data: { storeId: store.id, name, sort } }),
    ),
  );

  const products = [
    { categoryId: milliy.id, name: "Osh", price: 45000 },
    { categoryId: milliy.id, name: "Lag'mon", price: 35000 },
    { categoryId: milliy.id, name: "Manti", price: 30000 },
    { categoryId: salatlar.id, name: "Achchiq-chuchuk", price: 15000 },
    { categoryId: ichimliklar.id, name: "Choy", price: 5000 },
    { categoryId: ichimliklar.id, name: "Kompot", price: 8000 },
  ];

  for (const [sort, p] of products.entries()) {
    await prisma.product.create({
      data: {
        ...p,
        storeId: store.id,
        sort,
        ...(p.name === "Osh" && {
          optionGroups: {
            create: {
              name: "Porsiya",
              required: true,
              maxSelect: 1,
              options: {
                create: [
                  { name: "Yarim", price: -15000, sort: 0 },
                  { name: "To'liq", price: 0, sort: 1 },
                ],
              },
            },
          },
        }),
      },
    });
  }

  await prisma.deliveryZone.createMany({
    data: [
      { name: "Chilonzor", fee: 10000 },
      { name: "Yunusobod", fee: 15000 },
      { name: "Sergeli", fee: 20000 },
    ].map((z, sort) => ({ ...z, sort, storeId: store.id })),
  });

  console.log(`Seed tayyor: /${store.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
