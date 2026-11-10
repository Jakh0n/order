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

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
