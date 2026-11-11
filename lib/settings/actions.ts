"use server";

import { refresh, updateTag } from "next/cache";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { deleteMenuImage, menuImagePrefix } from "@/lib/storage";
import { storeCacheTag } from "@/lib/storefront";
import {
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

  // Logo va muqova faqat shu do'konning papkasidan
  const prefix = menuImagePrefix(store.id);
  for (const field of ["logoUrl", "coverUrl"] as const) {
    const url = data[field];
    if (url && (!prefix || !url.startsWith(prefix))) {
      return { ok: false, error: "invalid", fieldErrors: { [field]: "imageInvalid" } };
    }
  }

  const current = await prisma.store.findUnique({
    where: { id: store.id },
    select: { logoUrl: true, coverUrl: true, dineInEnabled: true },
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
