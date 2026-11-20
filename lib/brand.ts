/**
 * Tezda platform brand (logo masters: docs/brand/tezda/kit).
 * The mark is "— •": Morse code for "TE". Drawn on a 256×256 grid.
 */
export const BRAND_NAME = "Tezda";

export const BRAND = {
  red: "#F5333F",
  ink: "#0B0B0F",
  gradientFrom: "#FF5A4E",
  gradientTo: "#D91E36",
} as const;

/**
 * Typefaces: Manrope for headings (geometric, round even strokes like the wordmark; Latin + Cyrillic),
 * Inter for text and UI (Apple-like, neutral). Loaded with next/font in app/page.tsx and app/layout.tsx.
 */
export const BRAND_FONTS = { display: "Manrope", text: "Inter" } as const;

/** Main mark: tapered dash (the "trail") + dot. */
export const MARK = {
  dash: "M46.95 108.03L122.74 104.03A24 24 0 1 1 122.74 151.97L46.95 147.97A20 20 0 0 1 46.95 108.03Z",
  dot: { cx: 196, cy: 128, r: 32 },
} as const;

/** Small-size cut (favicons, app icons ≤ 192 px): thicker, with a wider gap so it doesn't close up. */
export const MARK_SMALL = {
  dash: "M38.80 104.03L118.60 100.04A28 28 0 1 1 118.60 155.96L38.80 151.97A24 24 0 0 1 38.80 104.03Z",
  dot: { cx: 208, cy: 128, r: 36 },
} as const;
