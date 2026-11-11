// Store look: brand color, page background, menu layout. Pure functions (client + server).

export const PAGE_BACKGROUNDS = ["gray", "white", "cream", "tint"] as const;
export type PageBackground = (typeof PAGE_BACKGROUNDS)[number];
export const MENU_LAYOUTS = ["list", "grid"] as const;
export type MenuLayout = (typeof MENU_LAYOUTS)[number];
export const FONT_STYLES = ["modern", "friendly", "elegant", "classic", "bold"] as const;
export type FontStyle = (typeof FONT_STYLES)[number];
export const CORNER_STYLES = ["sharp", "soft", "round"] as const;
export type CornerStyle = (typeof CORNER_STYLES)[number];
export const HEADER_STYLES = ["cover", "centered", "compact"] as const;
export type HeaderStyle = (typeof HEADER_STYLES)[number];

/**
 * Fonts (next/font variables defined in app/layout.tsx; files load only when a store uses them).
 * Body + headings; "elegant" keeps a readable sans body with serif headings.
 */
export const FONTS: Record<FontStyle, { body: string; heading: string }> = {
  modern: { body: "var(--font-sans)", heading: "var(--font-sans)" },
  friendly: { body: "var(--font-nunito)", heading: "var(--font-nunito)" },
  elegant: { body: "var(--font-sans)", heading: "var(--font-playfair)" },
  classic: { body: "var(--font-lora)", heading: "var(--font-lora)" },
  bold: { body: "var(--font-montserrat)", heading: "var(--font-montserrat)" },
};

/** --radius drives every rounded-* in the UI (globals.css) */
const RADIUS: Record<CornerStyle, string> = { sharp: "0.3rem", soft: "0.75rem", round: "1.25rem" };

function pick<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return list.includes(value as T) ? (value as T) : fallback;
}
export const asFontStyle = (v: unknown) => pick(FONT_STYLES, v, "modern");
export const asCornerStyle = (v: unknown) => pick(CORNER_STYLES, v, "soft");
export const asHeaderStyle = (v: unknown) => pick(HEADER_STYLES, v, "cover");

/** Ready-made brand colors (all ≥ 3:1 against white, so white text on buttons stays readable) */
export const BRAND_PRESETS = [
  "#16a05d", // Flami green
  "#e11d48", // red
  "#ea580c", // orange
  "#b45309", // amber/brown
  "#2563eb", // blue
  "#7c3aed", // purple
  "#db2777", // pink
  "#0f172a", // black
] as const;

/** Background colors; "gray" = the platform's muted gray */
const BACKGROUND_COLOR: Record<PageBackground, string> = {
  gray: "var(--muted)",
  white: "#ffffff",
  cream: "#faf6ee",
  // A whisper of the brand color
  tint: "color-mix(in oklab, var(--primary) 7%, white)",
};

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

export function asPageBackground(value: unknown): PageBackground {
  return PAGE_BACKGROUNDS.includes(value as PageBackground) ? (value as PageBackground) : "gray";
}

export function asMenuLayout(value: unknown): MenuLayout {
  return MENU_LAYOUTS.includes(value as MenuLayout) ? (value as MenuLayout) : "list";
}

/** WCAG relative luminance of "#rrggbb" */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Text color on top of the brand color (bold button text): white while it keeps 3:1,
 * near-black for light brand colors (yellow, light pink…).
 */
export function textOn(hex: string): string {
  return contrastRatio(hex, "#ffffff") >= 3 ? "#ffffff" : "#111111";
}

/** Too light for the green-text-on-white uses (links, prices): warn the owner */
export function isLowContrast(hex: string): boolean {
  return contrastRatio(hex, "#ffffff") < 3;
}

/**
 * CSS for the store's theme on :root (dialogs and sheets render outside the page, so a wrapper
 * isn't enough). Only validated hex values and fixed keywords go in — no user text.
 */
export function themeCss(theme: {
  brandColor: string | null;
  pageBackground: string;
  fontStyle?: string;
  cornerStyle?: string;
}): string {
  const font = FONTS[asFontStyle(theme.fontStyle)];
  const vars: string[] = [
    `--store-bg: ${BACKGROUND_COLOR[asPageBackground(theme.pageBackground)]}`,
    `--radius: ${RADIUS[asCornerStyle(theme.cornerStyle)]}`,
  ];
  if (isHexColor(theme.brandColor)) {
    vars.push(
      `--primary: ${theme.brandColor}`,
      `--primary-foreground: ${textOn(theme.brandColor)}`,
      `--ring: ${theme.brandColor}`,
    );
  }
  const fallback = "ui-sans-serif, system-ui, sans-serif";
  return (
    `:root{${vars.join(";")}}` +
    `body{font-family:${font.body}, ${fallback}}` +
    `h1,h2,h3{font-family:${font.heading}, ${fallback}}`
  );
}

/** "@name", "https://instagram.com/name/" → "name" */
export function socialHandle(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?(instagram\.com|t\.me|tiktok\.com)\/@?/i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

export const SOCIAL_PATTERNS = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  telegramChannel: /^[A-Za-z][A-Za-z0-9_]{3,31}$/,
  tiktok: /^[A-Za-z0-9._]{2,24}$/,
} as const;

export function socialUrl(kind: keyof typeof SOCIAL_PATTERNS, handle: string): string {
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "telegramChannel") return `https://t.me/${handle}`;
  return `https://www.tiktok.com/@${handle}`;
}
