"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MenuProduct } from "@/lib/menu-types";

// Savatdagi narxlar faqat ko'rsatish uchun. Buyurtma summasi serverda bazadan qayta hisoblanadi.

export const MAX_QUANTITY = 99;

export interface CartOption {
  id: string;
  groupId: string;
  name: string;
  price: number;
}

export interface CartLine {
  /** productId + tanlangan variantlar — bir xil tanlov bitta qatorga yig'iladi */
  key: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  options: CartOption[];
  quantity: number;
}

export type NewCartLine = Omit<CartLine, "key" | "quantity">;

interface CartState {
  /** slug → qatorlar (har bir do'konning savati alohida) */
  carts: Record<string, CartLine[]>;
  add: (slug: string, line: NewCartLine, quantity?: number) => void;
  setQuantity: (slug: string, key: string, quantity: number) => void;
  remove: (slug: string, key: string) => void;
  clear: (slug: string) => void;
  /** Menyuga moslash: yo'q bo'lgan taom/variantlarni olib tashlaydi, narx va nomlarni yangilaydi */
  sync: (slug: string, products: MenuProduct[]) => void;
}

export function lineKey(productId: string, optionIds: string[]) {
  return [productId, ...[...optionIds].sort()].join(":");
}

export function unitPrice(line: Pick<CartLine, "basePrice" | "options">) {
  return line.basePrice + line.options.reduce((sum, o) => sum + o.price, 0);
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + unitPrice(l) * l.quantity, 0);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

const clamp = (n: number) => Math.max(0, Math.min(MAX_QUANTITY, Math.floor(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      carts: {},

      add: (slug, line, quantity = 1) =>
        set((state) => {
          const lines = state.carts[slug] ?? [];
          const key = lineKey(
            line.productId,
            line.options.map((o) => o.id),
          );
          const existing = lines.find((l) => l.key === key);
          const next = existing
            ? lines.map((l) =>
                l.key === key ? { ...l, quantity: clamp(l.quantity + quantity) } : l,
              )
            : [...lines, { ...line, key, quantity: clamp(quantity) }];
          return { carts: { ...state.carts, [slug]: next } };
        }),

      setQuantity: (slug, key, quantity) =>
        set((state) => {
          const q = clamp(quantity);
          const lines = state.carts[slug] ?? [];
          const next =
            q === 0
              ? lines.filter((l) => l.key !== key)
              : lines.map((l) => (l.key === key ? { ...l, quantity: q } : l));
          return { carts: { ...state.carts, [slug]: next } };
        }),

      remove: (slug, key) =>
        set((state) => ({
          carts: {
            ...state.carts,
            [slug]: (state.carts[slug] ?? []).filter((l) => l.key !== key),
          },
        })),

      clear: (slug) =>
        set((state) => {
          const carts = { ...state.carts };
          delete carts[slug];
          return { carts };
        }),

      sync: (slug, products) =>
        set((state) => {
          const lines = state.carts[slug];
          if (!lines?.length) return state;

          const byId = new Map(products.map((p) => [p.id, p]));
          const next: CartLine[] = [];
          for (const line of lines) {
            const product = byId.get(line.productId);
            if (!product) continue;

            const optionsById = new Map(
              product.optionGroups.flatMap((g) =>
                g.options.map((o) => [o.id, { ...o, groupId: g.id }]),
              ),
            );
            const options = line.options.map((o) => optionsById.get(o.id));
            if (options.some((o) => !o)) continue;

            next.push({
              ...line,
              name: product.name,
              imageUrl: product.imageUrl,
              basePrice: product.price,
              options: options as CartOption[],
            });
          }
          return { carts: { ...state.carts, [slug]: next } };
        }),
    }),
    {
      name: "order-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ carts: state.carts }),
      // SSR bilan mos kelishi uchun localStorage faqat mount'dan keyin o'qiladi (CartSync)
      skipHydration: true,
    },
  ),
);

const EMPTY: CartLine[] = [];

/** Bitta do'kon savati (barqaror reference — keraksiz re-render yo'q) */
export function useCartLines(slug: string) {
  return useCart((s) => s.carts[slug] ?? EMPTY);
}
