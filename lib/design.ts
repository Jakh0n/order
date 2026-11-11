// Store look: brand color, page background, menu layout. Pure functions (client + server).

export const PAGE_BACKGROUNDS = ["gray", "white", "cream"] as const;
export type PageBackground = (typeof PAGE_BACKGROUNDS)[number];
export const MENU_LAYOUTS = ["list", "grid"] as const;
export type MenuLayout = (typeof MENU_LAYOUTS)[number];

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
export function themeCss(theme: { brandColor: string | null; pageBackground: string }): string {
  const vars: string[] = [`--store-bg: ${BACKGROUND_COLOR[asPageBackground(theme.pageBackground)]}`];
  if (isHexColor(theme.brandColor)) {
    vars.push(
      `--primary: ${theme.brandColor}`,
      `--primary-foreground: ${textOn(theme.brandColor)}`,
      `--ring: ${theme.brandColor}`,
    );
  }
  return `:root{${vars.join(";")}}`;
}
