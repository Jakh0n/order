import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale, type Locale, LOCALE_COOKIE } from "./config";

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
  // Chosen language (cookie) wins; otherwise the browser's language; otherwise English.
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : (fromAcceptLanguage(headerStore.get("accept-language")) ?? defaultLocale);

  return {
    locale,
    // Store-specific dates pass the store's own timeZone explicitly
    timeZone: "UTC",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
