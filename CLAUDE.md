@AGENTS.md

# order

Kafe, oshxona va restoranlar uchun Take App'ga o'xshash multi-tenant SaaS.
Birinchi do'kon — egasining oshxonasi (seed slug: `flami-grill`). Keyin boshqa kafelarga sotiladi.

## Ish jarayoni

1. Mijoz do'kon sahifasini ochadi: `/{slug}`
2. Taom tanlaydi (variantlar bilan), savatga qo'shadi
3. Checkout: ism, telefon, olib ketish yoki yetkazish (do'konning yagona yetkazish narxi), manzil +
   "Use my current location" (koordinata + manzil OSM Nominatim orqali, `lib/geo`),
   mo'ljal, vaqt, izoh, to'lov usuli
4. Buyurtma bazaga saqlanadi
5. Mijozning Telegram'i (`https://t.me/USERNAME?text=...`) yoki WhatsApp'i
   (`https://wa.me/<raqam>?text=...`) tayyor xabar bilan ochiladi va do'kon egasiga yuboradi
6. Mijoz `/o/{orderId}` sahifasida buyurtma holatini ko'radi
7. Do'kon egasi `/admin` da buyurtmalarni boshqaradi

To'lov: onlayn to'lov YO'Q. Faqat `CASH`, `CARD_ON_DELIVERY`, `TRANSFER` (biznes hisob raqamiga).
Egasi admin'da qo'lda "To'landi" qiladi.
Xalqaro platforma. Tillar: en, ru, uz (`messages/*.json`). Til: `NEXT_LOCALE` cookie → do'kon sahifasida `Store.locale`
(`proxy.ts` slug'ni header'da beradi, `getStoreLocale` keshlangan) → brauzer (Accept-Language) → en.
Yangi til = `i18n/config.ts` locales + messages fayli + `lib/order-message.ts` dictionaries.
Owner'ga xabar mijoz tilida (`Order.lang`).
Valyuta: har bir do'konda alohida (`Store.currency`, ISO 4217). Summalar Int — valyutaning eng kichik
birligida (USD → sent). Vaqt zonasi: har bir do'konda alohida (`Store.timeZone`, IANA).

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
  [store]/p/[page]/page.tsx   egasining sahifalari (Website → Pages), faqat e'lon qilinganlari
  [store]/checkout/page.tsx   checkout
  o/[orderId]/page.tsx        buyurtma holati
  signup/                     ro'yxatdan o'tish ustasi (hisob + do'kon)
  admin/layout.tsx            admin PWA: manifest (/admin.webmanifest, scope /admin/), public/sw.js — push
  admin/login/                kirish (email + parol)
  admin/(panel)/qr/           QR kodlar: do'kon havolasi + stoldan buyurtma (yoqish, stollar soni) + kartochkalar
  admin/tables/               stol kartochkalarini chop etish, A6/A5/A4 ((panel) layout'idan tashqarida)
  admin/print/[orderId]/      80mm: ?type=kitchen (narxsiz, stol katta) | receipt (mijoz cheki); &auto=1 — chop etish oynasi
  admin/(panel)/              do'kon egasi paneli: orders, orders/new, menu ("Products"), menu/products/[new|id], analytics,
                              analytics/customers, website/(editor)/{storefront|checkout|appearance|menu} (forma layout'da —
                              tab almashsa saqlanmagan o'zgarishlar yo'qolmaydi), website/pages, website/reviews, qr ("Dine-in"),
                              promos, settings, plan
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
  db.ts                       Prisma client singleton, JOIN (relationLoadStrategy: "join")
  app-url.ts                  getRequestOrigin — sayt manzili so'rovdan (QR, xabardagi havola)
  money.ts                    formatMoney(minor, currency), toMinor/toMajor, POPULAR_CURRENCIES
  order-message.ts            buildOrderMessage, telegramLink, whatsappLink
  validators.ts               zod sxemalar (checkoutFormSchema — klient, checkoutSchema — server)
  auth/session.ts             imzolangan cookie sessiya (AUTH_SECRET)
  auth/owner.ts               getCurrentUser, getCurrentOwner / requireOwner, requireSuperadmin, homePathFor
  auth/password.ts            scrypt xesh
  auth/actions.ts             login / logout
  auth/signup-actions.ts      signup (user + store bitta tranzaksiyada), checkSlug
  report-error.ts             reportError — try/catch'da yutilgan xatolarni Sentry'ga yuborish
  sentry-options.ts           Sentry sozlamalari (dataCollection: shaxsiy ma'lumot o'chiq)
  sentry-scrub.ts             telefon/email ni xabarlardan yashirish
  design.ts                   brend rangi, fon, shrift, burchak, sarlavha uslubi, menyu ko'rinishi, ijtimoiy tarmoqlar;
                              themeCss (faqat tekshirilgan hex va qat'iy kalitlar) — do'kon sahifasida :root ga
                              Design preview: /admin/preview (faqat egasi) — saqlanmagan qiymatlardan chiziladi (postMessage)
                              (StoreTheme)
  sections.ts                 do'kon sahifasi bo'limlari (Store.sections JSON): banner/sarlavha/menyu + matn/rasm bloklari;
                              StorefrontSections ularni chizadi (do'kon sahifasi va preview bir xil)
  popup.ts                    bir martalik oyna (Store.popup JSON): sarlavha/matn/rasm/tugma/taymer; tarkib o'zgarsa yana bir marta
  nav.ts                      Website → Menu: ☰ menyu havolalari (Store.navLinks), mahkamlangan kategoriyalar (orderCategories)
  plan.ts                     planOf / isPro (PAID + paidUntil kelajakda = Pro), FREE_MONTHLY_ORDERS, upgradeLink (SUPPORT_TELEGRAM)
  plan-history.ts             freeHistoryFilter — Free: oyiga 100 tadan keyingi YAKUNLANGAN buyurtmalar tarixda yashiriladi
  push/actions.ts             savePushSubscription / deletePushSubscription (requireOwner)
  push/send.ts                notifyNewOrder — web-push (VAPID), do'kon tilida; createOrder'dan `after()` bilan
  pages/                      StorePage: savePage / deletePage, getPublishedPage (kesh: storeCacheTag)
  reviews/                    Review: submitReview (/o sahifasida, faqat COMPLETED, buyurtmaga bitta, rate limit),
                              setReviewHidden; getReviewSummary (getStorefront ichida)
  rate-limit.ts               rateLimit / rateLimitAll (Postgres, qat'iy oyna), RULES, clientIp
  slug.ts                     slugify (kirill → lotin), RESERVED_SLUGS, slugError
  superadmin/data.ts          getPlatformStats, listStores
  superadmin/actions.ts       setStoreBlocked, extendPaidPlan, setFreePlan (requireSuperadmin)
  orders/actions.ts           createOrder — mijoz checkout'i
  orders/insert.ts            insertOrder — narx hisoblash + raqam berish + saqlash (umumiy)
  orders/admin-actions.ts     updateOrderStatus, setOrderPaid, createManualOrder
  orders/status.ts            holat o'tishlari (nextStatus, canTransition)
  orders/reorder-actions.ts   getReorderLines — "Order again" (/o sahifasi, kirishsiz, rate limit)
  orders/receipt-actions.ts   uploadOrderReceipt — mijoz TRANSFER chekini yuklaydi (kirishsiz, orderId bo'yicha)
  geo/                        lookupAddress (server action) → reverseGeocode (Nominatim; provayderni shu faylda almashtiring)
  ai/openai.ts                readMenu — OpenAI (Responses API + zod structured output), FAQAT serverda (OPENAI_API_KEY)
  ai/menu-schema.ts           AI natijasi sxemasi, toDraft, importDraftSchema (narxlar asosiy birlikda)
  menu/import-actions.ts      extractMenu (rasm/matn → qoralama, hech narsa saqlanmaydi, do'kon bo'yicha rate limit),
                              importMenu (tasdiqlangan qoralama → kategoriya/taomlar, takrorlar o'tkazib yuboriladi)
  menu/admin-data.ts          getAdminMenu, getAdminProduct (keshsiz, nofaollar ham)
  menu/admin-actions.ts       kategoriya/taom CRUD, tartiblash, "bugun yo'q", saveProduct (variantlar id bo'yicha moslanadi), rasm
  orders/promo.ts             promoProblem, promoDiscount, deliveryFeeFor (sof funksiyalar: klient preview + server)
  orders/promo-actions.ts     checkPromo — checkout'da "Qo'llash" (kirishsiz, rate limit)
  promos/                     admin: listPromos, createPromo / setPromoActive / deletePromo
  analytics/data.ts           getAnalytics(store, period) — SQL (do'kon vaqt zonasida), bekor qilinganlarsiz,
                              pul faqat joriy valyutadagi buyurtmalardan
  customers/data.ts           listCustomers — telefon bo'yicha guruhlangan mijozlar bazasi (qidiruv, saralash)
  orders/pricing.ts           priceItems — bazadagi narx + variant tekshiruvi (sof funksiya)
  orders/get-order.ts         getOrderForCustomer
  orders/send-link.ts         orderSendLink — do'kon kanaliga qarab t.me / wa.me havola
  seo.ts                      storeJsonLd (schema.org FoodEstablishment + menyu), getSitemapStores, topItemNames
  storefront.ts               getStorefront(slug), getCheckoutSettings(slug) — "use cache" + cacheTag(storeCacheTag(slug))
  menu-types.ts               server → klient menyu tiplari
  store-hours.ts              isStoreOpenNow / opensAt / startOfDayInZone; timeSlots / isValidSlot
                              (vaqt tanlash va yopiq paytda oldindan buyurtma — klient va server bitta manba)
  last-order.ts               mijozning oxirgi buyurtmasi (localStorage) — menyuda "Track" banner
  table-session.ts            stol QR: /{slug}?t=5 → stol raqami localStorage'da 4 soat (useTable, setTable)
  settings/options.ts         valyuta / vaqt zonasi ro'yxati — FAQAT serverda (brauzer ICU boshqacha → hydration xatosi)
  phone-prefix.ts             dialPrefix — telefon maydoniga do'kon mamlakat kodi
  cart-store.ts               zustand savat (cartKey bo'yicha, localStorage)
  cart-keys.ts                adminCartKey — admin savati alohida
  supabase/server.ts          service role client (server-only)
  settings/data.ts            getStoreSettings
  settings/actions.ts         saveStoreSettings (aloqa, ish vaqti, to'lov, kanal); saveTableSettings (QR); saveDesign (nom, logo,
                              muqova, tavsif, e'lon, rang, fon, menyu ko'rinishi)
  storage.ts                  uploadMenuImage, deleteMenuImage, menuImagePrefix; uploadReceipt, receiptUrls
                              (chek — yopiq `payment-receipts` bucket, admin'ga 1 soatlik signed URL)
  shrink-image.ts             shrinkImage — brauzerda rasmni kichraytirish (menyu, chek)
messages/{en,ru,uz}.json      matnlar (kalitlar bir xil bo'lishi shart)
components/currency-provider  CurrencyProvider + useFormatMoney (klient komponentlarda valyuta)
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
- Xatolar: `catch` da foydalanuvchiga do'stona xato qaytarsangiz, `reportError(e, "joy")` ni chaqiring
  (`console.error` emas) — aks holda Sentry'ga tushmaydi. Session Replay yoqilmaydi (checkout formasi).
- Ommaviy (kirishsiz) yoki qimmat Server Action'lar `rateLimit` bilan cheklanadi (`lib/rate-limit.ts` dagi RULES):
  login, signup, checkSlug, createOrder, rasm yuklash, chek yuklash, reorder, checkPromo, submitReview,
  AI menyu importi (menuImportFree 3 / menuImportPro 30 — 30 kunda, do'kon bo'yicha; AI pul turadi). Yangi shunday action qo'shsangiz — qoida qo'shing.
- Tezlik: bog'langan ma'lumot (include / nested select) o'qilsa — `...JOIN` qo'shing; bir-biriga bog'liq
  bo'lmagan so'rovlarni `Promise.all` bilan parallel qiling. Har bir so'rov bazaga borish = vaqt.
- Sayt manzilini `NEXT_PUBLIC_APP_URL` dan emas, `getRequestOrigin()` dan oling. U `APP_URL` (asosiy domen,
  hozir https://flami.org) ni ishlatadi, bo'lmasa so'rovdagi manzilni — QR va xabardagi havola localhost bo'lib qolmaydi.
- SEO: `app/robots.ts`, `app/sitemap.ts` (bloklanmagan, taomi bor do'konlar), `metadataBase` = `siteOrigin()`
  (APP_URL — redirect qilmaydigan asosiy domen bo'lishi shart). Do'kon sahifasi: title/description/canonical +
  JSON-LD; preview rasm `app/[store]/opengraph-image.tsx` (JPEG, WebP rasm sharp bilan o'giriladi).
  Shaxsiy sahifalar (`/o`, checkout, admin) — `robots: { index: false }`. Yangi top-level metadata fayli
  (icon, opengraph-image) qo'shsangiz — nomini RESERVED_SLUGS ga qo'shing.
- Pul: Int, do'kon valyutasining eng kichik birligida (sent). Ko'rsatish faqat `formatMoney(minor, currency)` /
  `useFormatMoney()` orqali. Admin formalarida asosiy birlik (8.99) — saqlashda `toMinor`; formalar uchun
  `productFormSchema` / `storeSettingsFormSchema`, server uchun `productSchema` / `storeSettingsSchema`.
- Holat ranglari (Ochiq / Yopiq, to'landi) brend rangiga bog'lanmaydi — doim yashil/qizil.
- Buyurtma o'z valyutasini saqlaydi (`Order.currency`) — summalar shu bilan ko'rsatiladi.
- Promo-kod va choychaqa: `Order.total = subtotal - discount + deliveryFee + tip`. Choychaqa (Website → Checkout,
  `Store.tipsEnabled`) — 0/5/10/15% chegirmadan keyingi taomlar summasidan, serverda qayta hisoblanadi (`tipAmount`).
  Email maydoni `Store.checkoutEmail` (off/optional/required) serverda ham tekshiriladi.
- Promo-kod: `Order.total = subtotal - discount + deliveryFee`. Chegirma taomlar summasiga; kod serverda qayta tekshiriladi
  va `usedCount` tranzaksiya ichida atomik oshiriladi (`maxUses` oshib ketmaydi). Bepul yetkazish (`Store.freeDeliveryFrom`)
  taomlar summasi bo'yicha (chegirmadan oldin). minOrder ham chegirmadan oldingi summa bo'yicha.
- Vaqt: hech qachon qattiq vaqt zonasi yozilmaydi — `store.timeZone` (ish vaqti, "bugun", sanalar).
- Telefon: xalqaro format (+mamlakat kodi), `phoneSchema` / `normalizePhone`.
- Buyurtma summasi SERVERDA bazadagi narxlardan qayta hisoblanadi, klient narxiga ishonilmaydi.
- `minOrder` (stoldan buyurtmadan tashqari), tuman narxi, `isAvailable`, do'kon ochiqligi serverda tekshiriladi.
- Buyurtma raqami `prisma.$transaction` ichida: do'kondagi `max(number) + 1`.
- `OrderItem`'da nom va narx snapshot qilib saqlanadi.
- Har bir yangi matn `messages/en.json` ga qo'shiladi (kodda matn yozilmaydi).
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

## Deploy (Vercel)

- `vercel.json`: region `hnd1` — baza bilan bir joyda (Supabase ap-northeast-1). Baza ko'chsa, region ham o'zgaradi.
- Build: `vercel-build` = `prisma generate && prisma migrate deploy && next build` — migratsiyalar avtomatik.
- Env: `DATABASE_URL` (6543, `pgbouncer=true&connection_limit=3`), `DIRECT_URL` (5432), `AUTH_SECRET`,
  `APP_URL=https://flami.org`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secret),
  `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (secret) + `VAPID_SUBJECT` (push),
  `SUPPORT_TELEGRAM`, `OPENAI_API_KEY` (secret, AI menyu importi), ixtiyoriy `OPENAI_MODEL` ("Pro'ga o'tish" tugmasi uchun username), ixtiyoriy `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`.
- Monitoring: `GET /api/health` (200 = ilova + baza ishlayapti, 503 = baza javob bermayapti) — uptime servisga ulang.
- Yuklama testi: `BASE_URL=<preview url> npm run loadtest` (k6, `loadtest/storefront.js`), production'ga emas.

## O'sish yo'l xaritasi (sekinlashmaslik uchun)

Qoida: taxmin emas — o'lchash (Sentry Performance + Prisma spanlar, `/api/health`, Supabase Query Performance),
keyin faqat eng tor joyni tuzatish. Mikroservislarga erta o'tilmaydi.

1. **Hozir → ~1 000 do'kon** (stack yetadi):
   - [x] Vercel region = baza regioni (`vercel.json`), `connection_limit`, migratsiyalar build'da
   - [x] Menyu keshi (`use cache` + `updateTag`), JOIN + parallel so'rovlar, indekslar (shu jumladan `Order(storeId, status, createdAt)`)
   - [x] Rate limit, Sentry (xatolar + performance + SQL spanlar), `/api/health`, k6 skripti
   - [ ] Supabase Pro (backup, uxlamaslik) va Vercel Pro (tijoriy foydalanish) — birinchi pullik mijoz bilan
   - [ ] Uptime monitor `/api/health` ga; deploy'dan keyin preview'da `npm run loadtest`
2. **~1 000 → 10 000 do'kon**: Supabase Query Performance bo'yicha indekslar / kattaroq DB; admin polling → Supabase
   Realtime; rate limit → Redis (Upstash); bildirishnomalar → navbat (queue); rasmlar → CDN / image transforms.
3. **10 000+ / ko'p mamlakat**: read replica (menyu, hisobotlar), ko'p regionlik; alohida servislar faqat aniq
   sabab bilan (Telegram bot, real-time, analitika) — `lib/` dagi biznes logika `packages/core` ga ajratiladi.

- Yetkazish: hududlar (DeliveryZone) endi ishlatilmaydi — `Store.deliveryFee` (yagona narx). Jadval ma'lumot yo'qolmasligi uchun qoldirilgan.
- Stoldan buyurtma (`DINE_IN`): `Store.dineInEnabled` + `tableCount` (QR kodlar sahifasida, Sozlamalarda emas); telefon bo'sh (""), manzil/vaqt yo'q, oldindan buyurtma yo'q, minOrder qo'llanmaydi;
  serverda stol raqami 1..tableCount tekshiriladi. Xabar sarlavhasida stol raqami.
- Buyurtmada `latitude/longitude` bo'lsa — xabarda, admin kartochkada va /o sahifada "Open in Maps" havolasi (`mapsLink`).

## Mahsulot yo'l xaritasi (funksiyalar)

Bozor: mahsulot global (barcha davlatlar), sotuv MDH'dan boshlanadi — O'zbekiston → Qozog'iston →
Qirg'iziston/Tojikiston → Kavkaz. Rossiya hozircha yo'q (WhatsApp cheklovi, 152-FZ, sanksiyalar).
Asosiy raqobatchi — Take App ($0 / $29 / $50, 0% komissiya). Bizning o'rin: faqat ovqatga ixtisoslashgan,
oddiy va arzonroq; 5 daqiqada o'zi ro'yxatdan o'tadi; Telegram + WhatsApp.

Tarif tamoyili: buyurtma qabul qilish HECH QACHON cheklanmaydi — pul o'sish vositalari uchun olinadi.
Kodda: Pro funksiyasi qo'shsangiz — `isPro(store)` ni SERVERDA tekshiring (action + mijozga ta'sir qiluvchi hisob),
UI'da `UpgradeCard` / `ProBadge` (`components/admin/upgrade.tsx`). Do'kon sahifasi keshida plan hisobga olinadi —
plan o'zgarganda `updateTag(storeCacheTag(slug))`.
- Free: hammasi asosiy + stol QR + chek chop etish; 100 saqlanadigan buyurtma/oy; analitika faqat "bugun"
- Pro (~$15, mahalliy narx): cheksiz buyurtma, promo-kod, bepul yetkazish chegarasi, analitika, mijozlar bazasi, logotipsiz, 1 xodim
- Business (~$35): 5 xodim, o'z domeni

P1 (navbat bo'yicha):
1. [x] Rus va o'zbek tillari (`messages/ru.json`, `uz.json`)
2. [x] Tarif limitlari kodda (`Store.plan`) + tarif sahifasi
3. [x] Stolga QR orqali buyurtma (`OrderType.DINE_IN`, stol raqami)
4. [x] Chek / oshxona varag'ini chop etish (80mm)
5. [x] Promo-kodlar + ma'lum summadan bepul yetkazish
6. [x] Analitika (tushum, o'rtacha chek, top taomlar, soatlar, qaytgan mijozlar) + mijozlar bazasi (telefon bo'yicha)
7. [ ] Telegram Mini App
8. [x] Admin push-bildirishnoma (PWA) + onboarding checklist

P2: shablon menyu, CSV/rasmdan menyu importi (AI), taom yorliqlari (achchiq, halol, hit), menyu tillari,
bir nechta to'lov rekviziti (Click/Payme/Kaspi) + nusxa tugmasi, masofaga qarab yetkazish narxi,
buyurtma qidiruvi / sana filtri, mijozlar eksporti, CSV hisobot, xodim rollari (kassir/oshpaz).

P3: vaqtga bog'liq kategoriyalar (nonushta), sodiqlik dasturi ("6-kofe bepul").
