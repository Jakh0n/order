"use server";

import { refresh, updateTag } from "next/cache";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { isPro } from "@/lib/plan";
import { DESIGN_SELECT, designFormValues } from "@/lib/settings/design-values";
import { mergeEdits } from "@/lib/settings/merge";
import { deleteMenuImage, menuImagePrefix } from "@/lib/storage";
import { storeCacheTag } from "@/lib/storefront";
import {
  type DesignInput,
  designSchema,
  type StoreSettingsInput,
  storeSettingsSchema,
  type TableSettingsInput,
  tableSettingsSchema,
} from "@/lib/validators";
import { reportError } from "@/lib/report-error";

export type SettingsResult =
  { ok: true } | { ok: false; error: "invalid" | "server"; fieldErrors?: Record<string, string> };

export async function saveStoreSettings(input: StoreSettingsInput): Promise<SettingsResult> {
  const { store } = await requireOwner();

  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const { extraWhatsappNumbers, extraTelegramUsernames, ...rest } = parsed.data;
  // Order rolling is Pro: on Free the extra contacts are not changed (kept for when they upgrade)
  const data = isPro(store) ? { ...rest, extraWhatsappNumbers, extraTelegramUsernames } : rest;

  const current = await prisma.store.findUnique({
    where: { id: store.id },
    select: { dineInEnabled: true },
  });
  if (!current) return { ok: false, error: "server" };
  // At least one way to order (table ordering is switched on the QR page)
  if (!data.pickupEnabled && !data.deliveryEnabled && !current.dineInEnabled) {
    return { ok: false, error: "invalid", fieldErrors: { deliveryEnabled: "noOrderType" } };
  }

  try {
    await prisma.store.update({ where: { id: store.id }, data });
  } catch (e) {
    reportError(e, "saveStoreSettings");
    return { ok: false, error: "server" };
  }

  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}

export type TableSettingsResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "noOrderType" | "server";
      fieldErrors?: Record<string, string>;
    };

/** QR page: table ordering on/off + number of tables */
export async function saveTableSettings(input: TableSettingsInput): Promise<TableSettingsResult> {
  const { store } = await requireOwner();

  const parsed = tableSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }

  try {
    const current = await prisma.store.findUnique({
      where: { id: store.id },
      select: { pickupEnabled: true, deliveryEnabled: true },
    });
    if (!current) return { ok: false, error: "server" };
    // Turning tables off must leave some way to order
    if (!parsed.data.dineInEnabled && !current.pickupEnabled && !current.deliveryEnabled) {
      return { ok: false, error: "noOrderType" };
    }
    await prisma.store.update({ where: { id: store.id }, data: parsed.data });
  } catch (e) {
    reportError(e, "saveTableSettings");
    return { ok: false, error: "server" };
  }

  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}

export type DesignResult =
  | { ok: true; kept: boolean }
  | {
      ok: false;
      error: "invalid" | "server" | "stale";
      fieldErrors?: Record<string, string>;
      /** stale: fields changed both in this editor and elsewhere */
      conflicts?: string[];
    };

/** Design page: name, logo, cover, description, announcement, colors, menu layout */
/**
 * base = the values the editor was loaded with. Only fields the owner changed are written, so
 * a value saved meanwhile elsewhere (another tab, a teammate) isn't overwritten by a stale form;
 * a field changed in both places stops the save ("stale").
 */
export async function saveDesign(input: DesignInput, base: DesignInput): Promise<DesignResult> {
  const { store } = await requireOwner();
  const parsed = designSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const data = parsed.data;

  // Logo and cover only from this store's own folder
  const prefix = menuImagePrefix(store.id);
  for (const field of ["logoUrl", "coverUrl"] as const) {
    const url = data[field];
    if (url && (!prefix || !url.startsWith(prefix))) {
      return { ok: false, error: "invalid", fieldErrors: { [field]: "imageInvalid" } };
    }
  }

  const [row, ownCategories] = await Promise.all([
    prisma.store.findUnique({ where: { id: store.id }, select: DESIGN_SELECT }),
    prisma.category.findMany({ where: { storeId: store.id }, select: { id: true } }),
  ]);
  if (!row) return { ok: false, error: "server" };
  const current = row;
  // Only this store's categories can be pinned
  const own = new Set(ownCategories.map((c) => c.id));
  data.pinnedCategoryIds = data.pinnedCategoryIds.filter((id) => own.has(id));

  // Compare like with like: base and the database go through the same schema as the input
  const baseParsed = designSchema.safeParse(base);
  const nowParsed = designSchema.safeParse(designFormValues(row));
  let patch: Partial<typeof data> = data;
  let kept = false;
  if (baseParsed.success && nowParsed.success) {
    const merged = mergeEdits(baseParsed.data, data, nowParsed.data);
    if (merged.conflicts.length > 0) {
      return { ok: false, error: "stale", conflicts: merged.conflicts.map(String) };
    }
    patch = merged.patch;
    kept = merged.kept.length > 0;
  }

  try {
    if (Object.keys(patch).length > 0) {
      await prisma.store.update({ where: { id: store.id }, data: patch });
    }
  } catch (e) {
    reportError(e, "saveDesign");
    return { ok: false, error: "server" };
  }

  // Replaced images are deleted from storage (only ones this save actually replaced)
  if ("logoUrl" in patch && current.logoUrl && current.logoUrl !== patch.logoUrl) {
    await deleteMenuImage(store.id, current.logoUrl);
  }
  if ("coverUrl" in patch && current.coverUrl && current.coverUrl !== patch.coverUrl) {
    await deleteMenuImage(store.id, current.coverUrl);
  }
  updateTag(storeCacheTag(store.slug));
  refresh();
  // kept: newer values from elsewhere stayed — the editor reloads to show them
  return { ok: true, kept };
}

/** Sidebar switch: pause / resume taking orders without opening Settings */
export async function setStoreAccepting(isOpen: boolean): Promise<{ ok: boolean }> {
  const { store } = await requireOwner();
  try {
    await prisma.store.update({ where: { id: store.id }, data: { isOpen: Boolean(isOpen) } });
  } catch (e) {
    reportError(e, "setStoreAccepting");
    return { ok: false };
  }
  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}
