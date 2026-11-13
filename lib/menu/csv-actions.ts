"use server";

import { getTranslations } from "next-intl/server";

import type { ImportDraft } from "@/lib/ai/menu-schema";
import { requireOwner } from "@/lib/auth/owner";
import { menuFromCsv, type MenuCsvProblem } from "@/lib/menu/csv";
import { isPro } from "@/lib/plan";

/** ~10 000 dishes with descriptions fit easily; anything bigger is not a menu */
const MAX_CSV_CHARS = 1_000_000;

export type MenuCsvActionResult =
  | { ok: true; draft: ImportDraft; rows: number; badPrices: number }
  | { ok: false; error: "pro" | "tooLarge" | MenuCsvProblem["kind"] };

/**
 * CSV import (Pro): the file is read in the browser and sent here as text; we return a draft
 * for the same review screen as the AI import. Nothing is saved until the owner confirms
 * (importMenu).
 */
export async function readMenuCsv(text: string): Promise<MenuCsvActionResult> {
  const { store } = await requireOwner();
  if (!isPro(store)) return { ok: false, error: "pro" };
  if (typeof text !== "string" || text.length > MAX_CSV_CHARS) {
    return { ok: false, error: "tooLarge" };
  }
  const t = await getTranslations("menuImport");
  const result = menuFromCsv(text, store.currency, t("csvDefaultCategory"));
  return result.ok ? result : { ok: false, error: result.problem.kind };
}
