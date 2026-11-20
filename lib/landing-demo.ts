import "server-only";

import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { DEMO_STORE_SLUGS } from "@/lib/demo";
import { buildOrderMessage } from "@/lib/order-message";
import { getStorefront } from "@/lib/storefront";

/** One product as the landing phone shows it (price in minor units of `currency`) */
export interface DemoProduct {
  id: string;
  name: string;
  note: string;
  price: number;
  img: string;
}

/** Everything the landing's animated phone needs, taken from the live demo store */
export interface LandingDemo {
  store: { name: string; logoUrl: string | null; coverUrl: string | null; currency: string };
  categories: string[];
  products: DemoProduct[];
  /** Product ids the "customer" taps, in order */
  picks: string[];
  customer: { name: string; phone: string; address: string };
  orderNumber: number;
  deliveryFee: number;
  subtotal: number;
  total: number;
  /** The exact Telegram message a real order produces (lib/order-message.ts) */
  message: string;
}

const ORDER_NUMBER = 27;
/** Which of the four shown products (one per category) get added: 1st, 2nd and 4th */
const PICK_INDEXES = [0, 1, 3];

/**
 * Real menu of the demo store (cached with the store page), so the landing shows what a store
 * built on the platform actually looks like. null when the demo store is missing or too small.
 */
export async function getLandingDemo(locale: Locale): Promise<LandingDemo | null> {
  const [data, t] = await Promise.all([
    getStorefront(DEMO_STORE_SLUGS[0]),
    getTranslations({ locale, namespace: "home.demo" }),
  ]);
  if (!data || data.store.isBlocked) return null;

  // One photographed, available dish per category: a varied menu in four rows
  const products: DemoProduct[] = [];
  for (const category of data.categories) {
    const p = category.products.find((x) => x.isAvailable && x.imageUrl);
    if (p?.imageUrl) {
      products.push({
        id: p.id,
        name: p.name,
        note: p.description ?? "",
        price: p.price,
        img: p.imageUrl,
      });
    }
    if (products.length === 4) break;
  }
  if (products.length < 4) return null;

  const picked = PICK_INDEXES.map((i) => products[i]);
  const subtotal = picked.reduce((s, p) => s + p.price, 0);
  const deliveryFee = data.store.deliveryEnabled ? data.store.deliveryFee : 0;
  const customer = {
    name: t("customerName"),
    phone: "+998 90 123 45 67",
    address: t("customerAddress"),
  };

  const message = buildOrderMessage(
    {
      id: "demo",
      number: ORDER_NUMBER,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: "DELIVERY",
      address: customer.address,
      paymentMethod: "CASH",
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: data.store.currency,
      items: picked.map((p) => ({ name: p.name, quantity: 1, lineTotal: p.price })),
    },
    { name: data.store.name, slug: data.store.slug },
    locale,
    undefined,
    "TELEGRAM",
  );

  return {
    store: {
      name: data.store.name,
      logoUrl: data.store.logoUrl,
      coverUrl: data.store.coverUrl,
      currency: data.store.currency,
    },
    categories: data.categories.slice(0, 3).map((c) => c.name),
    products,
    picks: picked.map((p) => p.id),
    customer,
    orderNumber: ORDER_NUMBER,
    deliveryFee,
    subtotal,
    total: subtotal + deliveryFee,
    message,
  };
}
