import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CartSync } from "@/components/storefront/cart-sync";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { ProductCard } from "@/components/storefront/product-card";
import { requireOwner } from "@/lib/auth/owner";
import { adminCartKey } from "@/lib/cart-keys";
import type { CheckoutSettings } from "@/lib/menu-types";
import { getCheckoutSettings, getStorefront } from "@/lib/storefront";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <NewOrder />
    </Suspense>
  );
}

async function NewOrder() {
  const { store } = await requireOwner();
  const [data, settings] = await Promise.all([
    getStorefront(store.slug),
    getCheckoutSettings(store.slug),
  ]);
  if (!data || !settings) notFound();

  const t = await getTranslations("adminOrders");
  const cartKey = adminCartKey(store.slug);

  // Egasi uchun mijozga yopilgan usullar ham ochiq (masalan, telefon orqali yetkazish)
  const adminSettings: CheckoutSettings = {
    ...settings,
    pickupEnabled: true,
    deliveryEnabled: true,
    paymentMethods: ["CASH", "CARD_ON_DELIVERY", "TRANSFER"],
  };

  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-2 border-b px-2 py-2 md:px-4">
        <Link
          href="/admin/orders"
          aria-label={t("tabs.active")}
          className="hover:bg-muted flex size-10 items-center justify-center rounded-lg"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{t("newTitle")}</h1>
      </header>

      <div className="grid lg:grid-cols-[1fr_minmax(0,28rem)]">
        <div className="px-4 pb-6 lg:border-r">
          {data.categories.map((category) => (
            <section key={category.id} className="pt-4">
              <h2 className="font-semibold">{category.name}</h2>
              <div className="divide-y">
                {category.products.map((product) => (
                  <ProductCard key={product.id} cartKey={cartKey} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="bg-muted border-t lg:border-t-0">
          <CheckoutForm store={data.store} settings={adminSettings} mode="admin" />
        </div>
      </div>

      <CartSync cartKey={cartKey} products={data.categories.flatMap((c) => c.products)} />
    </div>
  );
}
