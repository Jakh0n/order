---
name: order-flow
description: Buyurtma yaratish oqimi — checkout Server Action, narxni serverda hisoblash, raqam berish, Telegram/WhatsApp havolasi. Checkout yoki buyurtma logikasiga tegishli ishda ishlating.
---

# Buyurtma yaratish

Server Action (`"use server"`) ichida, tartib bilan:

1. **Validatsiya**: `checkoutSchema.safeParse(input)` (`@/lib/validators`). Xato bo'lsa maydon xatolarini qaytaring.
2. **Do'kon**: slug bo'yicha oling. Yo'q → xato. `isOpen=false` yoki ish vaqtidan tashqari (`openTime`/`closeTime`,
   Asia/Tashkent vaqti) → "yopiq" xatosi. Tanlangan `type` (pickup/delivery) va `paymentMethod` do'konda yoqilganini tekshiring.
3. **Narxlar bazadan**: `items` dagi `productId` larni `storeId` bilan birga oling (`include: optionGroups.options`).
   Klientdan kelgan narxga ISHONMANG. Topilmagan yoki `isAvailable=false` mahsulot → xato.
4. **Variantlar**: har `optionId` shu mahsulot guruhiga tegishli ekanini tekshiring; `required` guruh tanlanganini,
   `maxSelect` oshmaganini tekshiring. `unitPrice = product.price + sum(option.price)`, `lineTotal = unitPrice * quantity`.
5. **Tuman**: DELIVERY bo'lsa `zoneId` shu do'konniki ekanini tekshirib, `deliveryFee = zone.fee`, `zoneName` snapshot.
6. **minOrder**: `subtotal < store.minOrder` → xato.
7. **Saqlash** `prisma.$transaction` ichida: `aggregate({ _max: { number } })` + 1 → `order.create` (items bilan,
   `name`/`unitPrice`/`options` snapshot). `@@unique([storeId, number])` to'qnashsa (P2002) — bir-ikki marta qayta urinish.
8. **Xabar**: `buildOrderMessage(order, store, lang)` → `store.channel` ga qarab
   `telegramLink(store.telegramUsername, text)` yoki `whatsappLink(store.whatsappNumber, text)`.
9. `{ orderId, link }` qaytaring. Klientda: savatni (zustand) tozalang, `window.location.href = link` yoki yangi oynada oching,
   so'ng `/o/{orderId}` ga `router.push`.
10. `npm run check`.
