"use server";

import { refresh, updateTag } from "next/cache";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
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
  const data = parsed.data;

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
  { ok: true } | { ok: false; error: "invalid" | "server"; fieldErrors?: Record<string, string> };

/** Design page: name, logo, cover, description, announcement, colors, menu layout */
export async function saveDesign(input: DesignInput): Promise<DesignResult> {
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

  const [current, ownCategories] = await Promise.all([
    prisma.store.findUnique({
      where: { id: store.id },
      select: { logoUrl: true, coverUrl: true },
    }),
    prisma.category.findMany({ where: { storeId: store.id }, select: { id: true } }),
  ]);
  if (!current) return { ok: false, error: "server" };
  // Only this store's categories can be pinned
  const own = new Set(ownCategories.map((c) => c.id));
  data.pinnedCategoryIds = data.pinnedCategoryIds.filter((id) => own.has(id));

  try {
    await prisma.store.update({ where: { id: store.id }, data });
  } catch (e) {
    reportError(e, "saveDesign");
    return { ok: false, error: "server" };
  }

  // Replaced images are deleted from storage
  if (current.logoUrl && current.logoUrl !== data.logoUrl) {
    await deleteMenuImage(store.id, current.logoUrl);
  }
  if (current.coverUrl && current.coverUrl !== data.coverUrl) {
    await deleteMenuImage(store.id, current.coverUrl);
  }
  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
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
