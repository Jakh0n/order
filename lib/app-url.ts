import "server-only";

import { headers } from "next/headers";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** APP_URL — asosiy domen (masalan https://order.uz). localhost yoki noto'g'ri bo'lsa e'tiborsiz. */
function configuredOrigin(): string | null {
  const raw = process.env.APP_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (LOCAL_HOST.test(url.host)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Saytning manzili (https://domen) — QR kod, do'kon havolasi, xabardagi buyurtma havolasi uchun.
 * 1) APP_URL (asosiy domen) — chop etilgan QR doim bir xil bo'lishi uchun;
 * 2) bo'lmasa so'rovning o'zidan (Vercel: x-forwarded-host).
 * NEXT_PUBLIC_* ishlatilmaydi — u build paytida kodga yozilib qoladi (localhost bo'lib qolgan edi).
 */
/**
 * Canonical site origin for SEO (metadataBase, sitemap, robots, JSON-LD) — no request needed.
 * Must be the host that serves pages without redirecting (APP_URL).
 */
export function siteOrigin(): string {
  return configuredOrigin() ?? vercelProductionOrigin() ?? "http://localhost:3000";
}

/**
 * Fallback when APP_URL is missing on Vercel: the production domain Vercel exposes
 * (VERCEL_PROJECT_PRODUCTION_URL, e.g. "tezda.app"), so link previews and canonicals never
 * point at localhost. APP_URL still wins — set it to the host that doesn't redirect.
 */
function vercelProductionOrigin(): string | null {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return host ? `https://${host.replace(/^https?:\/\//, "")}` : null;
}

export async function getRequestOrigin(): Promise<string> {
  const configured = configuredOrigin();
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (LOCAL_HOST.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
