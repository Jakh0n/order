---
name: storefront-page
description: Mijozga ko'rinadigan do'kon sahifalarini (/[store], /[store]/checkout, /o/[orderId]) yaratish yoki o'zgartirish andozasi.
---

# Mijoz sahifasi andozasi

1. Server component'da ma'lumotni `prisma` (`@/lib/db`) orqali oling. `params` — Promise: `const { store } = await params`.
2. `cacheComponents` yoqilgan: DB o'qiydigan qismni alohida async komponentga ajratib, sahifada
   `<Suspense fallback={<Skeleton/>}>` bilan o'rang (yoki ataylab `"use cache"` + `cacheLife` + `cacheTag(`store:${slug}`)`
   ishlatib, admin o'zgartirganda `revalidateTag` qiling).
3. Do'kon slug bo'yicha topilmasa — `notFound()` (`next/navigation`).
4. Har doim `storeId` bo'yicha filtrlang. `Category.isActive=false` va `Product.isAvailable=false` ni
   mijozga ko'rsatmang (yoki "Bugun yo'q" deb o'chirilgan holda — dizaynga qarab), `sort` bo'yicha tartiblang.
5. Narxlar faqat `formatUZS(n)` (`@/lib/money`) orqali.
6. Matnlar `getTranslations` / `useTranslations` orqali; yangi kalitlar `uz.json` va `ru.json` ga (i18n-text skill).
7. Mobil birinchi: 375px uchun yozing, keyin `sm:`/`md:` bilan kengaytiring. Pastki savat tugmasi `sticky bottom-0`.
8. Rasmlar uchun `next/image`. Supabase domeni (`*.supabase.co`) `next.config.ts` → `images.remotePatterns` da bor;
   yangi domen kerak bo'lsa o'sha yerga qo'shing. `sizes` ni bering.
9. `generateMetadata` da do'kon nomini `title` qiling (do'kon nomi kodda yozilmaydi — bazadan).
10. `npm run check`.
