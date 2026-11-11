import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CurrencyProvider } from "@/components/currency-provider";
import { JsonLd } from "@/components/json-ld";
import { CartBar } from "@/components/storefront/cart-sheet";
import { CartSync } from "@/components/storefront/cart-sync";
import { MenuBrowser } from "@/components/storefront/menu-browser";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { StoreBlocked } from "@/components/storefront/store-blocked";
import { StoreHeader } from "@/components/storefront/store-header";
import { siteOrigin } from "@/lib/app-url";
import { storeJsonLd, topItemNames } from "@/lib/seo";
import { PreviewBridge } from "@/components/storefront/preview-bridge";
import { StoreTheme } from "@/components/storefront/store-theme";
import { asMenuLayout } from "@/lib/design";
import { getStorefront } from "@/lib/storefront";

export async function generateMetadata({ params }: PageProps<"/[store]">): Promise<Metadata> {
  const { store: slug } = await params;
  const data = await getStorefront(slug);
  if (!data) return {};
  const { store } = data;
  if (store.isBlocked) return { title: { absolute: store.name }, robots: { index: false } };

  const t = await getTranslations("seo");
  const items = topItemNames(data);
  const description = [
    items.length
      ? t("storeDescription", { name: store.name, items: items.join(", ") })
      : t("storeDescriptionNoItems", { name: store.name }),
    store.address && t("storeLocated", { address: store.address }),
  ]
    .filter(Boolean)
    .join(" ");
  const title = t("storeTitle", { name: store.name });

  // og:image comes from app/[store]/opengraph-image.tsx
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${store.slug}` },
    openGraph: { type: "website", title, description, url: `/${store.slug}` },
    twitter: { card: "summary_large_image", title, description },
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

  const t = await getTranslations("menu");

  return (
    <CurrencyProvider currency={store.currency}>
      <a
        href="#menu"
        className="bg-background focus:ring-ring sr-only z-50 rounded-lg px-3 py-2 font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
      >
        {t("skipToMenu")}
      </a>
      <JsonLd data={storeJsonLd(data, siteOrigin())} />
      {/* Gray background + white cards — sections stand apart clearly */}
      <StoreTheme brandColor={store.brandColor} pageBackground={store.pageBackground} />
      <PreviewBridge />
      <div className="flex-1 bg-(--store-bg)">
        <div className="mx-auto w-full max-w-2xl pb-28">
          <StoreHeader store={store} />
          <MenuBrowser
            cartKey={store.slug}
            categories={categories}
            layout={asMenuLayout(store.menuLayout)}
          />
          {/* Free plan: a quiet "Made with Flami" (Pro removes it) */}
          {store.showBranding && (
            <p className="text-muted-foreground py-6 text-center text-xs">
              <Link href="/" className="hover:text-foreground">
                {t("madeWith")}
              </Link>
            </p>
          )}
        </div>
        <CartSync cartKey={store.slug} products={products} />
        <CartBar store={store} products={products} />
      </div>
    </CurrencyProvider>
  );
}
