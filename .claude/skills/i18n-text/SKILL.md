---
name: i18n-text
description: UI'ga yangi matn qo'shish yoki o'zgartirish (uz va ru tarjimalari, next-intl). Har qanday foydalanuvchiga ko'rinadigan matn uchun ishlating.
---

# Yangi matn qo'shish

1. Kalit nomi: `sahifa.element` (masalan `checkout.submit`, `admin.menu.addProduct`). Mavjud bo'limdan foydalaning.
2. Kalitni UCHALA faylga qo'shing: `messages/en.json`, `ru.json`, `uz.json` (kalitlar bir xil bo'lishi shart).
   Rus plural: `one/few/many/other`; o'zbek: `other` yetarli (`{count, plural, other {# ta taom}}`).
   Yangi til qo'shilsa — `i18n/config.ts` dagi `locales`, `messages/<kod>.json` va `lib/order-message.ts` dictionaries.
3. O'zgaruvchilar ICU formatida: `"minOrder": "Minimal buyurtma: {amount}"`.
4. Komponentda:
   - Server: `const t = await getTranslations("checkout")` (`next-intl/server`)
   - Client: `const t = useTranslations("checkout")` (`next-intl`)
   - `t("submit")`, `t("minOrder", { amount: formatMoney(x, store.currency) })`
5. Kodda matnni to'g'ridan-to'g'ri yozmang. Do'kon/taom nomlari tarjima qilinmaydi — ular bazadan.
6. `npm run check`.
