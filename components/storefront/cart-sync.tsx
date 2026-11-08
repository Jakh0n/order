"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart-store";
import type { MenuProduct } from "@/lib/menu-types";

/** localStorage'dan savatni o'qiydi va joriy menyuga moslaydi (o'chgan taomlar, yangi narxlar). */
export function CartSync({ cartKey, products }: { cartKey: string; products: MenuProduct[] }) {
  useEffect(() => {
    const sync = () => useCart.getState().sync(cartKey, products);
    if (useCart.persist.hasHydrated()) {
      sync();
      return;
    }
    const unsubscribe = useCart.persist.onFinishHydration(sync);
    void useCart.persist.rehydrate();
    return unsubscribe;
  }, [cartKey, products]);

  return null;
}
