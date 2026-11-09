import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CartBar } from "@/components/storefront/cart-sheet";
import { CartSync } from "@/components/storefront/cart-sync";
import { MenuBrowser } from "@/components/storefront/menu-browser";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { StoreBlocked } from "@/components/storefront/store-blocked";
import { StoreHeader } from "@/components/storefront/store-header";
import { getStorefront } from "@/lib/storefront";

export async function generateMetadata({ params }: PageProps<"/[store]">): Promise<Metadata> {
  const { store: slug } = await params;
  const data = await getStorefront(slug);
  if (!data) return {};
  return {
    title: { absolute: data.store.name },
    description: data.store.address ?? undefined,
  };
}

export default function StorePage({ params }: PageProps<"/[store]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <Storefront params={params} />
    </Suspense>
  );
}

async function Storefront({ params }: { params: PageProps<"/[store]">["params"] }) {
  const { store: slug } = await params;
  const data = await getStorefront(slug);
  if (!data) notFound();
  if (data.store.isBlocked) return <StoreBlocked name={data.store.name} />;

  const { store, categories } = data;
  const products = categories.flatMap((c) => c.products);

  return (
    // Kulrang fon + oq kartochkalar — bo'limlar aniq ajralib turadi
    <div className="bg-muted flex-1">
      <div className="mx-auto w-full max-w-2xl pb-28">
        <StoreHeader store={store} />
        <MenuBrowser cartKey={store.slug} categories={categories} />
      </div>
      <CartSync cartKey={store.slug} products={products} />
      <CartBar store={store} />
    </div>
  );
}
