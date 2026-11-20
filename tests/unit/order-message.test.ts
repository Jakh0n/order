import { describe, expect, it } from "vitest";

import {
  buildOrderMessage,
  orderHashtag,
  type OrderMessageOrder,
  telegramLink,
  whatsappLink,
} from "@/lib/order-message";

const order: OrderMessageOrder = {
  id: "ord1",
  number: 12,
  customerName: "Ali",
  customerPhone: "+998901234567",
  type: "DELIVERY",
  address: "Chilonzor 5",
  latitude: 41.3,
  longitude: 69.2,
  paymentMethod: "CASH",
  subtotal: 2000000,
  discount: 200000,
  promoCode: "VIP",
  deliveryFee: 1000000,
  total: 2800000,
  currency: "UZS",
  items: [{ name: "Osh", quantity: 2, lineTotal: 2000000, options: [{ name: "Katta" }] }],
};
const store = { name: "Bahor Kafe", slug: "bahor-kafe" };

describe("buildOrderMessage", () => {
  it("has the items, totals, address, map and links", () => {
    const msg = buildOrderMessage(order, store, "en", "https://tezda.app/");
    expect(msg.split("\n")[0]).toBe("*#bahorkafeorder12*");
    expect(msg).toContain("*2x* Osh (Katta) UZS");
    expect(msg).toMatch(/\(VIP\): −UZS\s2,000/);
    expect(msg).toMatch(/\*Total: UZS\s28,000\*/);
    expect(msg).toContain("Chilonzor 5");
    expect(msg).toContain("https://www.google.com/maps/search/?api=1&query=41.300000,69.200000");
    expect(msg).toContain("https://tezda.app/o/ord1/invoice");
    expect(msg).toContain("https://tezda.app/bahor-kafe");
  });
  it("Telegram uses ** for bold", () => {
    const msg = buildOrderMessage(order, store, "en", undefined, "TELEGRAM");
    expect(msg.split("\n")[0]).toBe("**#bahorkafeorder12**");
    expect(msg).not.toContain("/o/ord1");
  });
  it("writes in the customer's language", () => {
    const en = buildOrderMessage(order, store, "en");
    const uz = buildOrderMessage(order, store, "uz");
    const ru = buildOrderMessage(order, store, "ru");
    expect(new Set([en, uz, ru]).size).toBe(3);
  });
  it("dine-in puts the table in the first line and has no time", () => {
    const msg = buildOrderMessage(
      { ...order, type: "DINE_IN", tableNumber: 5, deliveryFee: 0, address: null },
      store,
      "en",
    );
    expect(msg.split("\n")[0]).toMatch(/5/);
    expect(msg).not.toContain("Chilonzor");
  });
});

describe("links", () => {
  it("hashtag keeps letters and digits only", () => {
    expect(orderHashtag({ name: "Kafe № 1!" }, 3)).toBe("#kafe1order3");
    expect(orderHashtag({ name: "!!!" }, 3)).toBe("#tezdaorder3");
  });
  it("telegram accepts @user and t.me links", () => {
    expect(telegramLink("@bahor", "hi there")).toBe("https://t.me/bahor?text=hi%20there");
    expect(telegramLink("https://t.me/bahor", "x")).toBe("https://t.me/bahor?text=x");
  });
  it("whatsapp keeps digits only", () => {
    expect(whatsappLink("+998 (90) 123-45-67", "x")).toBe("https://wa.me/998901234567?text=x");
  });
});
