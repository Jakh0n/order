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
  signup/                     ro'yxatdan o'tish ustasi (hisob + do'kon)
  admin/login/                kirish (email + parol)
  admin/(panel)/              do'kon egasi paneli: orders, orders/new, menu, menu/products/[new|id], settings
  superadmin/                 platforma egasi: statistika, do'konlar, tarif (+1 oy / bepul), bloklash
components/ui/                shadcn komponentlari
components/storefront/        mijoz menyusi, variant oynasi, savat
components/checkout/          checkout formasi
components/order/             buyurtma holati (bosqichlar, avto-yangilanish)
components/admin/             admin: login formasi, buyurtma kartochkasi va amallari, confirm-dialog
components/admin/menu/        menyu: kategoriyalar, taom qatorlari, taom formasi (variantlar), rasm yuklash
components/admin/settings/    sozlamalar formasi, do'kon havolasi + QR
components/auth/              signup-form (2 qadamli usta)
components/superadmin/        do'kon amallari (tarif, bloklash)
i18n/                         next-intl sozlamasi (config, request, setLocale action)
lib/
  db.ts                       Prisma client singleton
  money.ts                    formatUZS
  order-message.ts            buildOrderMessage, telegramLink, whatsappLink
  validators.ts               zod sxemalar (checkoutFormSchema — klient, checkoutSchema — server)
  auth/session.ts             imzolangan cookie sessiya (AUTH_SECRET)
  auth/owner.ts               getCurrentUser, getCurrentOwner / requireOwner, requireSuperadmin, homePathFor
  auth/password.ts            scrypt xesh
  auth/actions.ts             login / logout
  auth/signup-actions.ts      signup (user + store bitta tranzaksiyada), checkSlug
  slug.ts                     slugify (kirill → lotin), RESERVED_SLUGS, slugError
  superadmin/data.ts          getPlatformStats, listStores
  superadmin/actions.ts       setStoreBlocked, extendPaidPlan, setFreePlan (requireSuperadmin)
  orders/actions.ts           createOrder — mijoz checkout'i
  orders/insert.ts            insertOrder — narx hisoblash + raqam berish + saqlash (umumiy)
  orders/admin-actions.ts     updateOrderStatus, setOrderPaid, createManualOrder
  orders/status.ts            holat o'tishlari (nextStatus, canTransition)
  menu/admin-data.ts          getAdminMenu, getAdminProduct (keshsiz, nofaollar ham)
  menu/admin-actions.ts       kategoriya/taom CRUD, tartiblash, "bugun yo'q", saveProduct (variantlar id bo'yicha moslanadi), rasm
  orders/pricing.ts           priceItems — bazadagi narx + variant tekshiruvi (sof funksiya)
  orders/get-order.ts         getOrderForCustomer
  orders/send-link.ts         orderSendLink — do'kon kanaliga qarab t.me / wa.me havola
  storefront.ts               getStorefront(slug), getCheckoutSettings(slug) — "use cache" + cacheTag(storeCacheTag(slug))
  menu-types.ts               server → klient menyu tiplari
  store-hours.ts              isStoreOpenNow (Asia/Tashkent)
  cart-store.ts               zustand savat (cartKey bo'yicha, localStorage)
  cart-keys.ts                adminCartKey — admin savati alohida
  supabase/server.ts          service role client (server-only)
  settings/data.ts            getStoreSettings
  settings/actions.ts         saveStoreSettings (do'kon, ish vaqti, tumanlar, to'lov, kanal)
  storage.ts                  uploadMenuImage, deleteMenuImage, menuImagePrefix
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
npm run user:password -- owner@order.uz   # foydalanuvchi parolini o'rnatish
npm run user:role -- you@mail.uz SUPERADMIN   # superadmin qilish (yoki OWNER)
```

## QOIDALAR

- Multi-tenant: har bir do'konga tegishli ma'lumot `storeId` bilan.
  Yangi top-level yo'l (app/<nom>) qo'shsangiz, `<nom>` ni `lib/slug.ts` dagi RESERVED_SLUGS ga qo'shing.
  Do'kon nomi, menyu, narx KODDA YOZILMAYDI — faqat bazada.
- Admin'dagi har bir Server Action foydalanuvchi shu do'kon egasi ekanini tekshiradi:
  `const { store } = await requireOwner()` va har bir so'rovda `where: { ..., storeId: store.id }`.
  Layout'dagi tekshiruv yetarli emas — har bir sahifa va action o'zi chaqiradi.
- Bloklangan do'kon (`Store.isBlocked`): mijoz menyusi va checkout yopiq, createOrder rad etadi,
  admin panelda ogohlantirish. Superadmin action'lari `requireSuperadmin()` bilan.
- Narxlar Int, so'mda. Ko'rsatish faqat `formatUZS` orqali.
- Buyurtma summasi SERVERDA bazadagi narxlardan qayta hisoblanadi, klient narxiga ishonilmaydi.
- `minOrder`, tuman narxi, `isAvailable`, do'kon ochiqligi serverda tekshiriladi.
- Buyurtma raqami `prisma.$transaction` ichida: do'kondagi `max(number) + 1`.
- `OrderItem`'da nom va narx snapshot qilib saqlanadi.
- Har bir yangi matn `uz.json` VA `ru.json` ga qo'shiladi.
- Avval mobil (375px), keyin desktop.
- Shartli forma maydonlarini (react-hook-form) unmount qilmang — `hidden` bilan yashiring,
  aks holda qayta ko'rsatilganda kiritilgan qiymat bo'sh ko'rinadi.
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
