"use client";

import { useEffect } from "react";

import { cartCount, cartSubtotal, useCart } from "@/lib/cart-store";
import { toMajor } from "@/lib/money";

// Meta (Facebook/Instagram) Pixel on the store's own pages (Pro). Anonymous events only:
// no names, phones, emails or addresses are ever sent (no "advanced matching").

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** The pixel and currency of the store page that is open (for AddToCart from the cart store) */
let active: { pixelId: string; currency: string } | null = null;
const initialised = new Set<string>();

/** Meta's standard loader: queue calls until fbevents.js arrives */
function ensurePixel(pixelId: string) {
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  if (!initialised.has(pixelId)) {
    window.fbq("init", pixelId);
    initialised.add(pixelId);
  }
}

function send(pixelId: string, event: string, params?: Record<string, unknown>, eventId?: string) {
  // trackSingle: only this store's pixel, even if the page somehow has another one
  window.fbq?.("trackSingle", pixelId, event, params ?? {}, eventId ? { eventID: eventId } : {});
}

/** Called by the cart when a dish is added (no-op when the store has no pixel) */
export function trackAddToCart(productId: string, name: string, minorValue: number) {
  if (!active || !window.fbq) return;
  send(active.pixelId, "AddToCart", {
    content_ids: [productId],
    content_name: name,
    content_type: "product",
    value: toMajor(minorValue, active.currency),
    currency: active.currency,
  });
}

export function MetaPixel({
  pixelId,
  currency,
  checkoutSlug,
  purchase,
}: {
  pixelId: string;
  currency: string;
  /** Checkout page: InitiateCheckout with this cart's total */
  checkoutSlug?: string;
  /** Order page: Purchase, once per order on this device */
  purchase?: { orderId: string; total: number; items: number };
}) {
  const orderId = purchase?.orderId;
  const total = purchase?.total;
  const items = purchase?.items;

  // Primitive deps: the order page auto-refreshes, and that must not re-send PageView / Purchase
  useEffect(() => {
    ensurePixel(pixelId);
    active = { pixelId, currency };
    send(pixelId, "PageView");

    if (checkoutSlug) {
      const lines = useCart.getState().carts[checkoutSlug] ?? [];
      if (lines.length > 0) {
        send(pixelId, "InitiateCheckout", {
          value: toMajor(cartSubtotal(lines), currency),
          currency,
          num_items: cartCount(lines),
          content_ids: lines.map((l) => l.productId),
          content_type: "product",
        });
      }
    }

    if (orderId && total !== undefined) {
      const key = `pixel-purchase:${orderId}`;
      let sent = false;
      try {
        sent = localStorage.getItem(key) === "1";
      } catch {
        // storage blocked: send anyway — eventID lets Meta drop a duplicate
      }
      if (!sent) {
        send(
          pixelId,
          "Purchase",
          {
            value: toMajor(total, currency),
            currency,
            num_items: items,
            content_type: "product",
          },
          `order-${orderId}`,
        );
        try {
          localStorage.setItem(key, "1");
        } catch {
          // ignore
        }
      }
    }

    return () => {
      if (active?.pixelId === pixelId) active = null;
    };
  }, [pixelId, currency, checkoutSlug, orderId, total, items]);

  return null;
}
