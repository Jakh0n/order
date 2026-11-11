"use server";

import { Prisma } from "@prisma/client";
import { refresh, updateTag } from "next/cache";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { type PageInput, pageSchema } from "@/lib/pages/schema";
import { reportError } from "@/lib/report-error";
import { storeCacheTag } from "@/lib/storefront";

export type PageResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: "invalid" | "slugTaken" | "notFound" | "server";
      fieldErrors?: Record<string, string>;
    };

/** Create or update one of the owner's pages */
export async function savePage(input: PageInput): Promise<PageResult> {
  const { store } = await requireOwner();
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const { id, ...data } = parsed.data;

  try {
    let saved: { id: string };
    if (id) {
      // Only this store's page
      const { count } = await prisma.storePage.updateMany({
        where: { id, storeId: store.id },
        data,
      });
      if (count === 0) return { ok: false, error: "notFound" };
      saved = { id };
    } else {
      saved = await prisma.storePage.create({
        data: { ...data, storeId: store.id },
        select: { id: true },
      });
    }
    updateTag(storeCacheTag(store.slug));
    refresh();
    return { ok: true, id: saved.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "slugTaken", fieldErrors: { slug: "slugTaken" } };
    }
    reportError(e, "savePage");
    return { ok: false, error: "server" };
  }
}

export async function deletePage(id: string): Promise<PageResult> {
  const { store } = await requireOwner();
  try {
    const { count } = await prisma.storePage.deleteMany({
      where: { id: String(id), storeId: store.id },
    });
    if (count === 0) return { ok: false, error: "notFound" };
    updateTag(storeCacheTag(store.slug));
    refresh();
    return { ok: true, id };
  } catch (e) {
    reportError(e, "deletePage");
    return { ok: false, error: "server" };
  }
}
