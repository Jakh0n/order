import { z } from "zod";

/** Owner page form. Error messages — "pages.errors.*" keys. */
export const pageSchema = z.object({
  id: z.string().max(50).optional(),
  title: z.string().trim().min(1, "titleRequired").max(80, "tooLong"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slugInvalid")
    .max(50, "tooLong"),
  body: z.string().trim().max(5000, "tooLong"),
  isPublished: z.boolean(),
});

export type PageInput = z.input<typeof pageSchema>;
