"use server";

import { refresh, updateTag } from "next/cache";

import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { deleteMenuImage, menuImagePrefix } from "@/lib/storage";
import { storeCacheTag } from "@/lib/storefront";
import { type StoreSettingsInput, storeSettingsSchema } from "@/lib/validators";
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
  const { zones, ...data } = parsed.data;

  // Logo faqat shu do'konning papkasidan
  const prefix = menuImagePrefix(store.id);
  if (data.logoUrl && (!prefix || !data.logoUrl.startsWith(prefix))) {
    return { ok: false, error: "invalid", fieldErrors: { logoUrl: "imageInvalid" } };
  }

  const current = await prisma.store.findUnique({
    where: { id: store.id },
    select: { logoUrl: true, zones: { select: { id: true } } },
  });
  if (!current) return { ok: false, error: "server" };

  // Klientdan kelgan tuman id lari shu do'konniki ekanini tekshiramiz
  const ownZoneIds = new Set(current.zones.map((z) => z.id));
  if (zones.some((z) => z.dbId && !ownZoneIds.has(z.dbId))) {
    return { ok: false, error: "invalid" };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.store.update({ where: { id: store.id }, data });

        // Eski buyurtmalarda tuman nomi snapshot — tumanni o'chirish ularga ta'sir qilmaydi
        const kept = zones.map((z) => z.dbId).filter(Boolean) as string[];
        await tx.deliveryZone.deleteMany({ where: { storeId: store.id, id: { notIn: kept } } });
        for (const [sort, z] of zones.entries()) {
          const fields = { name: z.name, fee: z.fee, sort };
          if (z.dbId) {
            await tx.deliveryZone.updateMany({
              where: { id: z.dbId, storeId: store.id },
              data: fields,
            });
          } else {
            await tx.deliveryZone.create({ data: { ...fields, storeId: store.id } });
          }
        }
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  } catch (e) {
    reportError(e, "saveStoreSettings");
    return { ok: false, error: "server" };
  }

  if (current.logoUrl && current.logoUrl !== data.logoUrl) {
    await deleteMenuImage(store.id, current.logoUrl);
  }
  updateTag(storeCacheTag(store.slug));
  refresh();
  return { ok: true };
}
