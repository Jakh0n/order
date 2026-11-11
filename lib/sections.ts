import { z } from "zod";

// Store page sections (Website → Storefront). Built-in sections can be moved and hidden;
// the owner's text / image blocks can also be deleted. Stored as JSON on Store.sections.

export const BUILT_IN_SECTIONS = ["announcement", "header", "menu"] as const;
export type BuiltInSection = (typeof BUILT_IN_SECTIONS)[number];
export const CUSTOM_SECTIONS = ["text", "image", "reviews"] as const;
export const MAX_SECTIONS = 12;

const base = { id: z.string().min(1).max(40), hidden: z.boolean() };

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.enum(BUILT_IN_SECTIONS) }),
  // Customer reviews block (optional, at most once)
  z.object({ ...base, type: z.literal("reviews") }),
  z.object({
    ...base,
    type: z.literal("text"),
    title: z.string().trim().max(60, "tooLong"),
    body: z.string().trim().max(500, "tooLong"),
  }),
  z.object({
    ...base,
    type: z.literal("image"),
    imageUrl: z.string().url().max(500).startsWith("https://").nullable(),
    link: z
      .string()
      .trim()
      .max(300, "tooLong")
      .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "linkInvalid"),
  }),
]);

export type Section = z.infer<typeof sectionSchema>;

export const sectionsSchema = z
  .array(sectionSchema)
  .max(MAX_SECTIONS)
  // Every built-in exactly once, the menu never hidden (a store without its menu is useless)
  .refine(
    (list) => BUILT_IN_SECTIONS.every((b) => list.filter((s) => s.type === b).length === 1),
    "sectionsInvalid",
  )
  .refine((list) => !list.some((s) => s.type === "menu" && s.hidden), "sectionsInvalid")
  .refine((list) => list.filter((s) => s.type === "reviews").length <= 1, "sectionsInvalid");

export const DEFAULT_SECTIONS: Section[] = [
  { id: "announcement", type: "announcement", hidden: false },
  { id: "header", type: "header", hidden: false },
  { id: "menu", type: "menu", hidden: false },
];

/** Stored JSON → valid sections (bad / missing data falls back to the default order) */
export function parseSections(value: unknown): Section[] {
  const parsed = sectionsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SECTIONS;
}

export function isBuiltIn(section: Section): boolean {
  return (BUILT_IN_SECTIONS as readonly string[]).includes(section.type);
}

export function newSection(type: (typeof CUSTOM_SECTIONS)[number]): Section {
  const id = `${type}-${Math.random().toString(36).slice(2, 9)}`;
  if (type === "text") return { id, type, hidden: false, title: "", body: "" };
  if (type === "reviews") return { id, type, hidden: false };
  return { id, type, hidden: false, imageUrl: null, link: "" };
}
