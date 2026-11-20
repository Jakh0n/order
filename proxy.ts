import { type NextRequest, NextResponse } from "next/server";

import { LOCALE_COOKIE } from "@/i18n/config";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  ATTRIBUTION_PATHS,
  attributionFromRequest,
  encodeAttribution,
} from "@/lib/attribution";
import { STORE_SLUG_HEADER } from "@/i18n/store-header";
import { RESERVED_SLUGS } from "@/lib/slug";

/**
 * Store pages (/{slug}, /{slug}/checkout): tells i18n/request.ts which store is open,
 * so a visitor without a chosen language sees the store's default language (Store.locale).
 * No DB access here — the lookup is cached in getStoreLocale.
 *
 * Landing page and /signup: remembers where a future owner came from (first touch, lib/attribution.ts).
 */
export function proxy(request: NextRequest) {
  // Strip a spoofed header from the client
  const headers = new Headers(request.headers);
  headers.delete(STORE_SLUG_HEADER);

  if (!request.cookies.has(LOCALE_COOKIE)) {
    const slug = request.nextUrl.pathname.split("/")[1]?.toLowerCase();
    if (slug && !RESERVED_SLUGS.has(slug)) headers.set(STORE_SLUG_HEADER, slug);
  }
  const response = NextResponse.next({ request: { headers } });

  const path = request.nextUrl.pathname;
  // Router prefetches aren't visits
  const prefetch = request.headers.has("next-router-prefetch");
  if (ATTRIBUTION_PATHS.has(path) && !prefetch && !request.cookies.has(ATTRIBUTION_COOKIE)) {
    const attribution = attributionFromRequest(
      request.nextUrl.searchParams,
      request.headers.get("referer"),
      request.nextUrl.host,
    );
    if (attribution) {
      response.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(attribution), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
      });
    }
  }
  return response;
}

export const config = {
  // The landing page, /{slug} (incl. /signup) and /{slug}/checkout; skips files (anything with a dot), _next and api
  matcher: ["/", "/((?!_next|api|monitoring)[^/.]+)", "/((?!_next|api|monitoring)[^/.]+)/checkout"],
};
