---
name: i18n-text
description: UI'ga yangi matn qo'shish yoki o'zgartirish (uz va ru tarjimalari, next-intl). Har qanday foydalanuvchiga ko'rinadigan matn uchun ishlating.
---

# Yangi matn qo'shish

1. Kalit nomi: `sahifa.element` (masalan `checkout.submit`, `admin.menu.addProduct`). Mavjud bo'limdan foydalaning.
2. Kalitni **ikkala** faylga qo'shing: `messages/uz.json` (o'zbek, lotin) va `messages/ru.json`. Tuzilma bir xil bo'lsin.
3. O'zgaruvchilar ICU formatida: `"minOrder": "Minimal buyurtma: {amount}"`.
4. Komponentda:
   - Server: `const t = await getTranslations("checkout")` (`next-intl/server`)
   - Client: `const t = useTranslations("checkout")` (`next-intl`)
   - `t("submit")`, `t("minOrder", { amount: formatUZS(x) })`
5. Kodda o'zbekcha/ruscha matnni to'g'ridan-to'g'ri yozmang. Do'kon/taom nomlari tarjima qilinmaydi — ular bazadan.
6. `npm run check`.
