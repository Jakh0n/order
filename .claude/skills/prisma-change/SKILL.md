---
name: prisma-change
description: Prisma sxemasini o'zgartirish (model, maydon, enum, indeks qo'shish/o'zgartirish) va migratsiya yaratish. Bazaga oid har qanday o'zgarishda ishlating.
---

# Prisma sxemasini o'zgartirish

1. `prisma/schema.prisma` ni o'qing va o'zgarishni kiriting.
   - Har bir do'konga tegishli model `storeId` + `@@index([storeId])` ga ega bo'lsin.
   - Pul maydonlari `Int` — do'kon valyutasining eng kichik birligida (sent).
   - Yangi maydon majburiy bo'lsa, `@default(...)` bering yoki avval nullable qiling.
2. **Ma'lumot yo'qotish xavfi bo'lsa TO'XTANG va foydalanuvchini ogohlantiring**:
   maydon/model o'chirish, nomini o'zgartirish (Prisma uni o'chirib-qayta yaratadi),
   turini o'zgartirish, nullable'ni majburiyga aylantirish, unique qo'shish.
   Tasdiqlanmaguncha migratsiya qilmang.
3. Migratsiya: `npm run db:migrate -- --name <qisqa_snake_case_nom>`
   (`.env` bo'lmasa — buyruqni foydalanuvchiga qoldiring, o'zingiz ishga tushirmang).
4. `prisma/seed.ts` ni yangi sxemaga moslang. Seed qayta ishga tushganda xato bermasligi kerak
   (upsert yoki do'kon menyusini tozalab qayta yaratish; buyurtmalarga tegmang).
5. Ta'sirlangan kodni yangilang (`lib/validators.ts`, server action'lar, tiplar).
6. `npm run check` — xatosiz bo'lsin.
