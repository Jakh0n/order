---
name: admin-crud
description: /admin ichida CRUD (kategoriya, taom, variant, tuman, sozlamalar, buyurtma holati) sahifa, forma va Server Action yaratish andozasi.
---

# Admin CRUD andozasi

1. **Zod sxema** `lib/validators.ts` da (yoki modul yonida). Pul — `z.number().int().min(0)`.
2. **Server Action** (`"use server"`):
   - Joriy foydalanuvchini oling (auth helper). Yo'q → xato.
   - Tahrirlanayotgan yozuvning `storeId` si shu foydalanuvchiga tegishli do'kon ekanini tekshiring
     (`store.ownerId === user.id`). Har bir `update`/`delete` da `where` ga `storeId` qo'shing — boshqa do'kon ma'lumotiga
     tegish imkoni bo'lmasin.
   - `safeParse` → xato bo'lsa `{ ok: false, errors }`.
   - Prisma bilan yozing, keyin `revalidatePath("/admin/...")` va mijoz sahifasi uchun `revalidatePath(`/${slug}`)`
     (yoki tegishli `revalidateTag`).
   - `{ ok: true }` qaytaring.
3. **Forma** (client component): `react-hook-form` + `zodResolver`, shadcn `Input`/`Label`/`Select`/`Checkbox`/`Button`.
   Yuborilganda `sonner` → `toast.success(t("..."))` / `toast.error(...)`.
4. **Rasm**: serverda `uploadMenuImage(storeId, file)` (`@/lib/storage`) — faqat image/*, ≤2 MB. URL ni `imageUrl` ga saqlang.
5. **Matnlar**: barcha yozuvlar `uz.json` va `ru.json` ga (i18n-text skill).
6. Ro'yxatlar mobil'da kartochka, desktop'da `Table`.
7. `npm run check`.
