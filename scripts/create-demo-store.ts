// Usage: npm run demo:store -- <folder with photos>
// Creates (or refreshes) the public demo store "Bahor Kafe" at /bahor-kafe — the one the landing
// page links to. Touches only this store and its own demo owner; safe to run again.
// Photos: <folder>/logo.png, cover.jpg and one <photo>.jpg per dish below
// (Unsplash License — free for commercial use). Uploaded to the "menu-images" bucket.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

try {
  loadEnvFile(".env");
} catch {
  // no .env — use the shell environment
}

const SLUG = "bahor-kafe";
const DEMO_OWNER = "demo@flami.org";
const BUCKET = "menu-images";
/** UZS has 2 minor digits in ISO 4217: 45 000 so'm = 4 500 000 */
const som = (n: number) => n * 100;

type Item = {
  name: string;
  description: string;
  price: number;
  photo?: string;
  groups?: { name: string; required: boolean; maxSelect: number; options: [string, number][] }[];
};

const MENU: { category: string; items: Item[] }[] = [
  {
    category: "Milliy taomlar",
    items: [
      {
        name: "Toshkent oshi",
        description: "Devzira guruch, mol go'shti, sariq sabzi, no'xat va bedana tuxumi.",
        price: 45000,
        photo: "osh",
        groups: [
          {
            name: "Porsiya",
            required: true,
            maxSelect: 1,
            options: [
              ["1 kishilik", 0],
              ["1,5 kishilik", 20000],
            ],
          },
        ],
      },
      {
        name: "Qozon kabob",
        description: "Qozonda qovurilgan mol go'shti va kartoshka, ko'kat bilan.",
        price: 42000,
        photo: "dimlama",
      },
      {
        name: "Qo'lda cho'zilgan lag'mon",
        description: "Go'sht va sabzavotli qayla, qo'lda cho'zilgan xamir.",
        price: 38000,
        photo: "lagmon",
      },
      {
        name: "Manti (5 dona)",
        description: "Bug'da pishgan, mol go'shti va piyozli. Qaymoq bilan.",
        price: 35000,
        photo: "manti",
        groups: [
          {
            name: "Qo'shimcha",
            required: false,
            maxSelect: 2,
            options: [
              ["Qaymoq", 5000],
              ["Achchiq qayla", 3000],
            ],
          },
        ],
      },
      {
        name: "Chuchvara sho'rva",
        description: "Mayda chuchvara, tiniq sho'rva, ko'kat va qatiq bilan.",
        price: 30000,
        photo: "chuchvara",
      },
      {
        name: "Shashlik (mol go'shti)",
        description: "Ko'mirda pishgan, piyoz va non bilan. Narx bir six uchun.",
        price: 22000,
        photo: "shashlik",
      },
    ],
  },
  {
    category: "Somsa va non",
    items: [
      {
        name: "Tandir somsa",
        description: "Qatlama xamir, mol go'shti va dumba, tandirda pishgan.",
        price: 9000,
        photo: "somsa",
      },
      { name: "Patir non", description: "Har kuni ertalab tandirdan.", price: 8000, photo: "non" },
    ],
  },
  {
    category: "Fast food",
    items: [
      {
        name: "Tovuqli lavash",
        description: "Tovuq go'shti, pomidor, bodring, kartoshka fri va sous.",
        price: 32000,
        photo: "lavash",
        groups: [
          {
            name: "O'lcham",
            required: true,
            maxSelect: 1,
            options: [
              ["Oddiy", 0],
              ["Katta", 8000],
            ],
          },
          {
            name: "Qo'shimcha",
            required: false,
            maxSelect: 2,
            options: [
              ["Pishloq", 4000],
              ["Halapeno", 3000],
            ],
          },
        ],
      },
      {
        name: "Klassik burger",
        description: "Mol go'shti kotleti, cheddar, pomidor, salat bargi va maxsus sous.",
        price: 39000,
        photo: "burger",
        groups: [
          {
            name: "Qo'shimcha",
            required: false,
            maxSelect: 2,
            options: [
              ["Ikkinchi kotlet", 15000],
              ["Pishloq", 5000],
            ],
          },
        ],
      },
      {
        name: "Kartoshka fri",
        description: "Tilla rangda qovurilgan, ketchup bilan.",
        price: 15000,
        photo: "fri",
        groups: [
          {
            name: "O'lcham",
            required: true,
            maxSelect: 1,
            options: [
              ["O'rta", 0],
              ["Katta", 6000],
            ],
          },
        ],
      },
    ],
  },
  {
    category: "Salatlar",
    items: [
      {
        name: "Sabzavotli salat",
        description: "Pomidor, bodring, sabzi, ko'kat va zaytun moyi.",
        price: 18000,
        photo: "salat",
      },
    ],
  },
  {
    category: "Ichimliklar",
    items: [
      {
        name: "Ko'k choy (choynak)",
        description: "Limon va novvot bilan.",
        price: 6000,
        photo: "choy",
      },
      {
        name: "Uy kompoti (1 l)",
        description: "Mavsumiy mevalardan.",
        price: 15000,
        photo: "kompot",
      },
      {
        name: "Yalpizli limonad",
        description: "Limon, laym va yalpiz, muz bilan.",
        price: 18000,
        photo: "limonad",
      },
      {
        name: "Kapuchino",
        description: "Yangi tortilgan kofe va ko'pikli sut.",
        price: 20000,
        photo: "kofe",
      },
    ],
  },
  {
    category: "Shirinliklar",
    items: [
      {
        name: "Shokoladli tort",
        description: "Qatlamli, karamel krem bilan. Bir bo'lak.",
        price: 22000,
        photo: "tort",
      },
      {
        name: "Paxlava (2 dona)",
        description: "Pistali, asalli sharbat bilan.",
        price: 18000,
        photo: "paxlava",
      },
      {
        name: "Muzqaymoq (3 shar)",
        description: "Vanil, shokolad va qulupnay.",
        price: 20000,
        photo: "muzqaymoq",
      },
    ],
  },
];

async function main() {
  const dir = process.argv[2];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dir || !url || !key) {
    console.error(
      "Usage: npm run demo:store -- <photo folder>\n" +
        "Needs DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  try {
    // A demo-only owner without a password: nobody signs in as it
    const owner = await prisma.user.upsert({
      where: { email: DEMO_OWNER },
      update: {},
      create: { email: DEMO_OWNER, name: "Demo", role: "OWNER" },
    });
    // Orders from the demo go to the same Telegram as the old demo store did
    const legacy = await prisma.store.findUnique({
      where: { slug: "flami-grill" },
      select: { telegramUsername: true },
    });

    const details = {
      name: "Bahor Kafe",
      description: "Milliy taomlar va tandir somsa. Har kuni yangi.",
      announcement: "150 000 so'mdan buyurtmaga yetkazish bepul",
      brandColor: "#e8590c",
      pageBackground: "cream",
      menuLayout: "grid",
      fontStyle: "friendly",
      cornerStyle: "round",
      headerStyle: "cover",
      currency: "UZS",
      timeZone: "Asia/Tashkent",
      locale: "uz",
      address: "Toshkent (demo do'kon)",
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      dineInEnabled: true,
      tableCount: 12,
      minOrder: som(30000),
      deliveryFee: som(12000),
      freeDeliveryFrom: som(150000),
      acceptCash: true,
      acceptCardOnDelivery: true,
      acceptTransfer: false,
      channel: "TELEGRAM" as const,
      telegramUsername: legacy?.telegramUsername ?? null,
      // Pro without an end date, so the demo shows Pro features and no "Made with Flami"
      plan: "PAID" as const,
      paidUntil: null,
    };
    const store = await prisma.store.upsert({
      where: { slug: SLUG },
      update: details,
      create: { slug: SLUG, ownerId: owner.id, ...details },
    });

    // Photos → public bucket, under this store's folder (same layout as owner uploads)
    const uploaded = new Set<string>();
    const photoUrl = async (name: string, ext: "jpg" | "png" = "jpg") => {
      const file = await readFile(path.join(dir, `${name}.${ext}`));
      // Content hash in the name: a changed photo gets a new URL (no stale CDN / browser cache)
      const hash = createHash("sha1").update(file).digest("hex").slice(0, 8);
      const objectPath = `stores/${store.id}/demo-${name}-${hash}.${ext}`;
      uploaded.add(objectPath.split("/").pop()!);
      const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
        contentType: ext === "png" ? "image/png" : "image/jpeg",
        upsert: true,
      });
      if (error) throw new Error(`Upload ${name}: ${error.message}`);
      return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    };

    const coverUrl = await photoUrl("cover");
    const logoUrl = await photoUrl("logo", "png");
    await prisma.store.update({ where: { id: store.id }, data: { coverUrl, logoUrl } });

    // Rebuild only this store's menu (option groups cascade with products)
    await prisma.product.deleteMany({ where: { storeId: store.id } });
    await prisma.category.deleteMany({ where: { storeId: store.id } });
    let dishes = 0;
    for (const [cSort, cat] of MENU.entries()) {
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
            price: som(item.price),
            imageUrl: item.photo ? await photoUrl(item.photo) : null,
            sort: pSort,
            optionGroups: {
              create: (item.groups ?? []).map((g, gSort) => ({
                name: g.name,
                required: g.required,
                maxSelect: g.maxSelect,
                sort: gSort,
                options: {
                  create: g.options.map(([name, price], oSort) => ({
                    name,
                    price: som(price),
                    sort: oSort,
                  })),
                },
              })),
            },
          },
        });
        dishes++;
      }
    }
    // Remove demo photos from earlier runs that nothing uses any more
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(`stores/${store.id}`, { limit: 1000 });
    const stale = (files ?? [])
      .map((f) => f.name)
      .filter((n) => n.startsWith("demo-") && !uploaded.has(n))
      .map((n) => `stores/${store.id}/${n}`);
    if (stale.length) await supabase.storage.from(BUCKET).remove(stale);

    console.log(`Demo store ready: /${SLUG} — ${MENU.length} categories, ${dishes} dishes`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
