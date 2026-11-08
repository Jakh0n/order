// Do'kon slug'i: /{slug} — mijoz menyusi manzili.

/** app/ ichidagi yo'llar va kelajakda kerak bo'lishi mumkin bo'lganlar */
export const RESERVED_SLUGS = new Set([
  "admin",
  "superadmin",
  "o",
  "signup",
  "login",
  "logout",
  "api",
  "app",
  "www",
  "help",
  "about",
  "pricing",
  "terms",
  "privacy",
  "blog",
  "static",
  "assets",
  "public",
  "order",
  "orders",
  "checkout",
  "settings",
  "dashboard",
  "monitoring", // Sentry tunnel (next.config.ts → tunnelRoute)
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const CYRILLIC: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "h",
};

/** "Mening Oshxonam" -> "mening-oshxonam", "Кафе Ўзбегим" -> "kafe-ozbegim" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "") // o'zbekcha tutuq belgilari: "o'sh" -> "osh"
    .replace(/[\u0400-\u04ff]/g, (ch) => CYRILLIC[ch] ?? "")
    .normalize("NFKD") // "№" -> "No", "é" -> "e" + belgi
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

/** Xato kaliti yoki null */
export function slugError(slug: string): "slugInvalid" | "slugReserved" | null {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX || !SLUG_PATTERN.test(slug)) {
    return "slugInvalid";
  }
  if (slug.includes("--")) return "slugInvalid";
  if (RESERVED_SLUGS.has(slug)) return "slugReserved";
  return null;
}
