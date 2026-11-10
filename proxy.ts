import { type NextRequest, NextResponse } from "next/server";

import { LOCALE_COOKIE } from "@/i18n/config";
import { STORE_SLUG_HEADER } from "@/i18n/store-header";
import { RESERVED_SLUGS } from "@/lib/slug";

/**
 * Store pages (/{slug}, /{slug}/checkout): tells i18n/request.ts which store is open,
 * so a visitor without a chosen language sees the store's default language (Store.locale).
 * No DB access here — the lookup is cached in getStoreLocale.
 */
export function proxy(request: NextRequest) {
  // Strip a spoofed header from the client
  const headers = new Headers(request.headers);
  headers.delete(STORE_SLUG_HEADER);

  if (!request.cookies.has(LOCALE_COOKIE)) {
    const slug = request.nextUrl.pathname.split("/")[1]?.toLowerCase();
    if (slug && !RESERVED_SLUGS.has(slug)) headers.set(STORE_SLUG_HEADER, slug);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Only /{slug} and /{slug}/checkout; skips files (anything with a dot), _next and api
  matcher: ["/((?!_next|api|monitoring)[^/.]+)", "/((?!_next|api|monitoring)[^/.]+)/checkout"],
};
