import "server-only";

import { prisma } from "@/lib/db";
import type { StoreSettingsInput } from "@/lib/validators";

/** Sozlamalar formasi uchun boshlang'ich qiymatlar (faqat shu do'konniki) */
export async function getStoreSettings(storeId: string): Promise<StoreSettingsInput | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });
  if (!store) return null;

  return {
    name: store.name,
    logoUrl: store.logoUrl,
    phone: store.phone ?? "",
    address: store.address ?? "",
    landmark: store.landmark ?? "",
    currency: store.currency,
    timeZone: store.timeZone,
    isOpen: store.isOpen,
    openTime: store.openTime ?? "",
    closeTime: store.closeTime ?? "",
    pickupEnabled: store.pickupEnabled,
    deliveryEnabled: store.deliveryEnabled,
    minOrder: store.minOrder,
    deliveryFee: store.deliveryFee,
    acceptCash: store.acceptCash,
    acceptCardOnDelivery: store.acceptCardOnDelivery,
    acceptTransfer: store.acceptTransfer,
    transferDetails: store.transferDetails ?? "",
    channel: store.channel,
    telegramUsername: store.telegramUsername ?? "",
    whatsappNumber: store.whatsappNumber ?? "",
  };
}
