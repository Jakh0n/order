@AGENTS.md

# order

Kafe, oshxona va restoranlar uchun Take App'ga o'xshash multi-tenant SaaS.
Birinchi do'kon — egasining oshxonasi (slug: `oshxonam`). Keyin boshqa kafelarga sotiladi.

## Ish jarayoni

1. Mijoz do'kon sahifasini ochadi: `/{slug}`
2. Taom tanlaydi (variantlar bilan), savatga qo'shadi
3. Checkout: ism, telefon, olib ketish yoki yetkazish, tuman (narxi bilan), manzil,
   mo'ljal, vaqt, izoh, to'lov usuli
4. Buyurtma bazaga saqlanadi
5. Mijozning Telegram'i (`https://t.me/USERNAME?text=...`) yoki WhatsApp'i
   (`https://wa.me/998XXXXXXXXX?text=...`) tayyor xabar bilan ochiladi va do'kon egasiga yuboradi
6. Mijoz `/o/{orderId}` sahifasida buyurtma holatini ko'radi
7. Do'kon egasi `/admin` da buyurtmalarni boshqaradi

To'lov: onlayn to'lov YO'Q. Faqat `CASH`, `CARD_ON_DELIVERY`, `TRANSFER` (biznes hisob raqamiga).
Egasi admin'da qo'lda "To'landi" qiladi.
Tillar: o'zbek (asosiy, default) va rus.
Valyuta: so'm, butun son (Int). Ko'rinishi: "45 000 so'm".

## Stack

- Next.js 16 App Router + TypeScript (strict). `cacheComponents: true` yoqilgan:
  `cookies()`, `headers()`, `params`, ma'lumotlar bazasi o'qishlari `<Suspense>` ichida
  yoki `"use cache"` bilan bo'lishi kerak. Kod yozishdan oldin `node_modules/next/dist/docs/` ni o'qing.
- Tailwind CSS v4 + shadcn/ui
- Prisma 6 + PostgreSQL (Supabase, eu-central-1)
- Supabase Storage — faqat rasmlar uchun (`menu-images` bucket). Supabase Auth ishlatilmaydi.
- zod + react-hook-form
- next-intl (uz, ru) — URL prefiksisiz, til `NEXT_LOCALE` cookie'da
- zustand — savat
- lucide-react, qrcode
- Alohida backend yo'q — Server Actions
- Hosting: Vercel, region fra1

## Papka tuzilmasi

```
app/
  page.tsx                    landing
  [store]/page.tsx            mijoz: menyu
  [store]/checkout/page.tsx   checkout
  o/[orderId]/page.tsx        buyurtma holati
  admin/                      do'kon egasi paneli (orders, menu, settings)
  superadmin/                 platforma egasi
components/ui/                shadcn komponentlari
components/storefront/        mijoz menyusi, variant oynasi, savat
i18n/                         next-intl sozlamasi (config, request, setLocale action)
lib/
  db.ts                       Prisma client singleton
  money.ts                    formatUZS
  order-message.ts            buildOrderMessage, telegramLink, whatsappLink
  validators.ts               zod sxemalar (checkout)
  storefront.ts               getStorefront(slug) — "use cache" + cacheTag(storeCacheTag(slug))
  menu-types.ts               server → klient menyu tiplari
  store-hours.ts              isStoreOpenNow (Asia/Tashkent)
  cart-store.ts               zustand savat (slug bo'yicha, localStorage)
  supabase/server.ts          service role client (server-only)
  storage.ts                  uploadMenuImage
messages/uz.json, ru.json     tarjimalar
prisma/schema.prisma, seed.ts
```

## Buyruqlar

```bash
npm run dev          # http://localhost:3000
npm run check        # lint + typecheck
npm run db:migrate   # prisma migrate dev (-- --name <nom>)
npm run db:seed      # namunaviy ma'lumot (qayta ishga tushirsa bo'ladi)
npm run db:studio    # Prisma Studio
```

## QOIDALAR

- Multi-tenant: har bir do'konga tegishli ma'lumot `storeId` bilan.
  Do'kon nomi, menyu, narx KODDA YOZILMAYDI — faqat bazada.
- Admin'dagi har bir Server Action foydalanuvchi shu do'kon egasi ekanini tekshiradi.
- Narxlar Int, so'mda. Ko'rsatish faqat `formatUZS` orqali.
- Buyurtma summasi SERVERDA bazadagi narxlardan qayta hisoblanadi, klient narxiga ishonilmaydi.
- `minOrder`, tuman narxi, `isAvailable`, do'kon ochiqligi serverda tekshiriladi.
- Buyurtma raqami `prisma.$transaction` ichida: do'kondagi `max(number) + 1`.
- `OrderItem`'da nom va narx snapshot qilib saqlanadi.
- Har bir yangi matn `uz.json` VA `ru.json` ga qo'shiladi.
- Avval mobil (375px), keyin desktop.
- Supabase faqat Storage uchun; ma'lumotlar faqat Prisma orqali.
- `SUPABASE_SERVICE_ROLE_KEY` hech qachon klient kodiga tushmaydi.
- Har o'zgarishdan keyin: `npm run check`.
- HOZIR QILINMAYDI: onlayn to'lov, Telegram bot, mobil ilova, ko'p filial.

## Ish tartibi

1. Sxema + seed
2. Mijoz sahifasi + savat + checkout + Telegram/WhatsApp xabari + `/o/[orderId]`
3. Admin: buyurtmalar (ro'yxat, holat, "To'landi", qo'lda buyurtma, bugungi tushum)
4. Admin: menyu (kategoriya, taom, rasm, variantlar, "Bugun yo'q")
5. Admin: sozlamalar (do'kon, tumanlar, to'lov usullari, Telegram/WhatsApp)
6. Ro'yxatdan o'tish + do'kon yaratish ustasi (boshqa kafelar uchun)
7. Superadmin paneli (barcha do'konlar, tarif, bloklash)

## Skill'lar

`.claude/skills/`: `prisma-change`, `storefront-page`, `order-flow`, `admin-crud`, `i18n-text`.
