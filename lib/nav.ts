import { z } from "zod";

// Website → Menu: the store's ☰ menu links and pinned categories.

export const MAX_NAV_LINKS = 8;

export const navLinkSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1, "linkLabelRequired").max(40, "tooLong"),
  /** https:// link, or a path on this site ("/my-store/p/about") */
  url: z
    .string()
    .trim()
    .max(300, "tooLong")
    .refine((v) => /^https:\/\/\S+$/.test(v) || /^\/[\w\-/]*$/.test(v), "linkInvalid"),
});
export type NavLink = z.infer<typeof navLinkSchema>;
export const navLinksSchema = z.array(navLinkSchema).max(MAX_NAV_LINKS);

export const pinnedSchema = z.array(z.string().min(1).max(50)).max(50);

export function parseNavLinks(value: unknown): NavLink[] {
  const parsed = navLinksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parsePinned(value: unknown): string[] {
  const parsed = pinnedSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** Pinned categories first (in the pinned order), the rest keep their menu order */
export function orderCategories<T extends { id: string }>(categories: T[], pinned: string[]): T[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const first = pinned.map((id) => byId.get(id)).filter((c): c is T => !!c);
  const firstIds = new Set(first.map((c) => c.id));
  return [...first, ...categories.filter((c) => !firstIds.has(c.id))];
}

export function newNavLink(): NavLink {
  return { id: `link-${Math.random().toString(36).slice(2, 9)}`, label: "", url: "" };
}
