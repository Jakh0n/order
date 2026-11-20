// To add a language: add its code here and messages/<code>.json with the same keys
// (and to the dictionaries in lib/order-message.ts).
export const locales = ["en", "ru", "uz"] as const;
export type Locale = (typeof locales)[number];
/** Each language's name in that language (shown in the switcher; not translated). */
export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uz: "O‘zbekcha",
};

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Landing page per language: "/" is English (x-default), "/ru" and "/uz" are their own URLs,
 *  so search engines can index every language (they send no cookie or Accept-Language). */
export function landingPath(locale: Locale): string {
  return locale === defaultLocale ? "/" : `/${locale}`;
}

/** "/ru" -> "ru"; "/" and anything else -> null */
export function landingLocale(pathname: string): Locale | null {
  const seg = pathname.replace(/^\/+|\/+$/g, "");
  return isLocale(seg) && seg !== defaultLocale ? seg : null;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
