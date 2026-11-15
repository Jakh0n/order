import type { Prisma } from "@prisma/client";

/**
 * Public demo stores (the landing's "See a live store"). Their sample orders and reviews are
 * labelled on the store page and kept out of platform numbers (superadmin stats).
 */
export const DEMO_STORE_SLUGS = ["bahor-kafe"] as const;

export function isDemoStore(slug: string): boolean {
  return (DEMO_STORE_SLUGS as readonly string[]).includes(slug);
}

/** Prisma filter: every store except the demo ones */
export const realStores = {
  slug: { notIn: [...DEMO_STORE_SLUGS] },
} satisfies Prisma.StoreWhereInput;
