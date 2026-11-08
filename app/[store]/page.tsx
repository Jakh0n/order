import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CartBar } from "@/components/storefront/cart-sheet";
import { CartSync } from "@/components/storefront/cart-sync";
import { CategoryNav } from "@/components/storefront/category-nav";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { ProductCard } from "@/components/storefront/product-card";
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

  const { store, categories } = data;
  const t = await getTranslations("menu");
  const products = categories.flatMap((c) => c.products);

  return (
    <div className="mx-auto w-full max-w-2xl pb-28">
      <StoreHeader store={store} />
      <CategoryNav categories={categories} />

      <main className="px-4">
        {categories.length === 0 && (
          <p className="text-muted-foreground py-16 text-center">{t("empty")}</p>
        )}
        {categories.map((category) => (
          <section key={category.id} id={`c-${category.id}`} className="scroll-mt-14 pt-6">
            <h2 className="text-lg font-semibold">{category.name}</h2>
            <div className="divide-y">
              {category.products.map((product) => (
                <ProductCard key={product.id} slug={store.slug} product={product} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <CartSync slug={store.slug} products={products} />
      <CartBar store={store} />
    </div>
  );
}
