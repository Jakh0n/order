"use client";

import { useEffect, useState } from "react";

import { CurrencyProvider } from "@/components/currency-provider";
import { CheckoutMock } from "@/components/admin/design/checkout-mock";
import { PromoPopup } from "@/components/storefront/promo-popup";
import { StorefrontSections } from "@/components/storefront/storefront-sections";
import { asEmailMode, type EmailMode } from "@/lib/orders/promo";
import {
  asCornerStyle,
  asFontStyle,
  asHeaderStyle,
  asMenuLayout,
  asPageBackground,
  isHexColor,
  SOCIAL_PATTERNS,
  socialHandle,
  themeCss,
} from "@/lib/design";
import type { StorefrontData, StorefrontStore } from "@/lib/menu-types";
import { type NavLink, navLinkSchema, pinnedSchema } from "@/lib/nav";
import { type Popup, popupSchema } from "@/lib/popup";
import { type Section, sectionsSchema } from "@/lib/sections";

export const PREVIEW_MESSAGE = "flami-design-preview";

/** What the Design form sends: its current (unsaved) values */
export type DesignDraft = Partial<
  Pick<
    StorefrontStore,
    | "name"
    | "logoUrl"
    | "coverUrl"
    | "description"
    | "announcement"
    | "brandColor"
    | "pageBackground"
    | "menuLayout"
    | "fontStyle"
    | "cornerStyle"
    | "headerStyle"
    | "showSearch"
    | "showDescriptions"
    | "instagram"
    | "telegramChannel"
    | "tiktok"
    | "sections"
    | "popup"
    | "navLinks"
    | "pinnedCategoryIds"
  >
>;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
const image = (v: unknown) => (typeof v === "string" && v.startsWith("https://") ? v : null);
const social = (v: unknown, kind: keyof typeof SOCIAL_PATTERNS) => {
  const handle = typeof v === "string" ? socialHandle(v) : "";
  return SOCIAL_PATTERNS[kind].test(handle) ? handle : null;
};

/** Only known fields, only valid values — the draft comes from a postMessage */
function applyDraft(store: StorefrontStore, d: Record<string, unknown>): StorefrontStore {
  return {
    ...store,
    name: text(d.name, 80) || store.name,
    logoUrl: image(d.logoUrl),
    coverUrl: image(d.coverUrl),
    description: text(d.description, 300) || null,
    announcement: text(d.announcement, 160) || null,
    brandColor: isHexColor(d.brandColor) ? d.brandColor : null,
    pageBackground: asPageBackground(d.pageBackground),
    menuLayout: asMenuLayout(d.menuLayout),
    fontStyle: asFontStyle(d.fontStyle),
    cornerStyle: asCornerStyle(d.cornerStyle),
    headerStyle: asHeaderStyle(d.headerStyle),
    showSearch: d.showSearch !== false,
    showDescriptions: d.showDescriptions !== false,
    instagram: social(d.instagram, "instagram"),
    telegramChannel: social(d.telegramChannel, "telegramChannel"),
    tiktok: social(d.tiktok, "tiktok"),
    // Invalid / half-edited sections keep the last good order
    popup: popupSchema.safeParse(d.popup).success ? (d.popup as Popup) : store.popup,
    // Half-typed links are skipped, not shown broken
    navLinks: Array.isArray(d.navLinks)
      ? d.navLinks.filter((l): l is NavLink => navLinkSchema.safeParse(l).success)
      : store.navLinks,
    pinnedCategoryIds: pinnedSchema.safeParse(d.pinnedCategoryIds).success
      ? (d.pinnedCategoryIds as string[])
      : store.pinnedCategoryIds,
    sections: sectionsSchema.safeParse(d.sections).success
      ? (d.sections as Section[])
      : store.sections,
  };
}

/**
 * Design page preview: the store header and menu drawn from the form's unsaved values.
 * Runs inside the admin's iframe; accepts drafts only from this same site.
 */
export function DesignPreview({ data }: { data: StorefrontData }) {
  const [store, setStore] = useState(data.store);
  // Website → Checkout tab: show the checkout instead of the menu
  const [checkout, setCheckout] = useState<{
    on: boolean;
    email: EmailMode;
    note: boolean;
    promo: boolean;
    tips: boolean;
  }>({ on: false, email: "off", note: true, promo: true, tips: false });
  // Appearance tab: the popup is shown so the owner sees what they're editing
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as { type?: string; draft?: Record<string, unknown>; tab?: unknown };
      if (msg?.type !== PREVIEW_MESSAGE || !msg.draft) return;
      setStore(applyDraft(data.store, msg.draft));
      const d = msg.draft;
      setShowPopup(msg.tab === "appearance");
      setCheckout({
        on: msg.tab === "checkout",
        email: asEmailMode(d.checkoutEmail),
        note: d.checkoutNote !== false,
        promo: d.checkoutPromo !== false,
        tips: d.tipsEnabled === true,
      });
    }
    window.addEventListener("message", onMessage);
    // Ask the Design form for its current values
    window.parent.postMessage({ type: `${PREVIEW_MESSAGE}:ready` }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [data.store]);

  return (
    <CurrencyProvider currency={store.currency}>
      <style>{themeCss(store)}</style>
      <div className="min-h-dvh bg-(--store-bg)">
        <div className="mx-auto w-full max-w-2xl pb-10">
          {checkout.on ? (
            <CheckoutMock
              categories={data.categories}
              email={checkout.email}
              note={checkout.note}
              promo={checkout.promo}
              tips={checkout.tips}
            />
          ) : (
            <StorefrontSections
              store={store}
              categories={data.categories}
              sections={store.sections}
              cartKey={`preview:${store.slug}`}
            />
          )}
          {showPopup && <PromoPopup slug={store.slug} popup={store.popup} forceOpen />}
        </div>
      </div>
    </CurrencyProvider>
  );
}
