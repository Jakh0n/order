import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CartSync } from "@/components/storefront/cart-sync";
import { MenuSkeleton } from "@/components/storefront/menu-skeleton";
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

  const t = await getTranslations("checkout");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="flex items-center gap-2 border-b px-2 py-2">
        <Link
          href={`/${slug}`}
          aria-label={t("backToMenu")}
          className="hover:bg-muted flex size-10 items-center justify-center rounded-lg"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="leading-tight font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground truncate text-sm">{data.store.name}</p>
        </div>
      </header>

      <CartSync cartKey={slug} products={data.categories.flatMap((c) => c.products)} />
      <CheckoutForm store={data.store} settings={settings} />
    </div>
  );
}
