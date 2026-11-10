import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { reportError } from "@/lib/report-error";
import { getStoreLocale } from "@/lib/storefront";

import { defaultLocale, isLocale, type Locale, LOCALE_COOKIE } from "./config";
import { STORE_SLUG_HEADER } from "./store-header";

/** First supported language from Accept-Language ("ru-RU,ru;q=0.9,en;q=0.8" -> "ru"). */
function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.split("-")[0].toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => isLocale(r.lang))?.lang as Locale | undefined ?? null;
}

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  // 1) the customer's own choice (cookie) 2) on a store page — the store's language
  // (header set by proxy.ts) 3) the browser's language 4) English
  let locale: Locale | null = isLocale(cookieLocale) ? cookieLocale : null;
  if (!locale) {
    const slug = headerStore.get(STORE_SLUG_HEADER);
    if (slug) {
      try {
        const storeLocale = await getStoreLocale(slug);
        if (isLocale(storeLocale)) locale = storeLocale;
      } catch (e) {
        // Never break the page over the language — fall back to the browser's
        reportError(e, "i18n.storeLocale");
      }
    }
  }
  locale ??= fromAcceptLanguage(headerStore.get("accept-language")) ?? defaultLocale;

  return {
    locale,
    // Store-specific dates pass the store's own timeZone explicitly
    timeZone: "UTC",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
