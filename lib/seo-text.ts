// Pure helpers for search and link-preview text (unit-tested in tests/unit/seo-text.test.ts).

/** Owner rich text (**bold**, _italic_, ~~strike~~, line breaks) → one plain line. */
export function plainText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/(^|\s)_([^_]+)_(?=\s|[.,!?]|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** First line of the owner's text, plain — a short tagline. */
export function firstLine(text: string | null | undefined): string {
  return plainText((text ?? "").split("\n").find((l) => l.trim()) ?? "");
}

/** Cuts at a word boundary and adds "…" (search snippets, previews). */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:·-]+$/, "")}…`;
}

/** No open/close time (or equal times) means the store never closes. */
export function isAlwaysOpen(store: {
  openTime: string | null;
  closeTime: string | null;
}): boolean {
  return !store.openTime || !store.closeTime || store.openTime === store.closeTime;
}
