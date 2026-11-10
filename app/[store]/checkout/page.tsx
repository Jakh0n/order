import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CurrencyProvider } from "@/components/currency-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CartSync } from "@/components/storefront/cart-sync";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
import { StoreBlocked } from "@/components/storefront/store-blocked";
import { getCheckoutSettings, getStorefront } from "@/lib/storefront";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default function CheckoutPage({ params }: PageProps<"/[store]/checkout">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <Checkout params={params} />
    </Suspense>
  );
}

async function Checkout({ params }: { params: PageProps<"/[store]/checkout">["params"] }) {
  const { store: slug } = await params;
  const [data, settings] = await Promise.all([getStorefront(slug), getCheckoutSettings(slug)]);
  if (!data || !settings) notFound();
  if (data.store.isBlocked) return <StoreBlocked name={data.store.name} />;

  const t = await getTranslations("checkout");

  return (
    <div className="bg-muted flex-1">
      <div className="mx-auto w-full max-w-2xl">
        <header className="bg-background/95 sticky top-0 z-30 flex items-center gap-2 border-b px-2 py-2 backdrop-blur">
          <Link
            href={`/${slug}`}
            aria-label={t("backToMenu")}
            className="hover:bg-muted flex size-10 items-center justify-center rounded-full"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="leading-tight font-bold">{t("title")}</h1>
            <p className="text-muted-foreground truncate text-sm">{data.store.name}</p>
          </div>
          <LanguageSwitcher />
        </header>

        <CartSync cartKey={slug} products={data.categories.flatMap((c) => c.products)} />
        <CurrencyProvider currency={data.store.currency}>
          <CheckoutForm store={data.store} settings={settings} />
        </CurrencyProvider>
      </div>
    </div>
  );
}
