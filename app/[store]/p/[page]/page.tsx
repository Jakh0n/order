import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { RichText } from "@/components/storefront/rich-text";
import { StoreTheme } from "@/components/storefront/store-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublishedPage } from "@/lib/pages/data";
import { getStorefront } from "@/lib/storefront";

export async function generateMetadata({
  params,
}: PageProps<"/[store]/p/[page]">): Promise<Metadata> {
  const { store: slug, page } = await params;
  const [data, doc] = await Promise.all([getStorefront(slug), getPublishedPage(slug, page)]);
  if (!data || !doc) return {};
  return { title: `${doc.title} · ${data.store.name}` };
}

/** Owner's own page (Website → Pages): About us, Delivery info… */
export default function StorePageRoute({ params }: PageProps<"/[store]/p/[page]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-10 h-64 w-full max-w-2xl" />}>
      <StorePageContent params={params} />
    </Suspense>
  );
}

async function StorePageContent({ params }: Pick<PageProps<"/[store]/p/[page]">, "params">) {
  const { store: slug, page } = await params;
  const [data, doc, t] = await Promise.all([
    getStorefront(slug),
    getPublishedPage(slug, page),
    getTranslations("checkout"),
  ]);
  if (!data || !doc || data.store.isBlocked) notFound();
  const { store } = data;

  return (
    <div className="flex-1 bg-(--store-bg)">
      <StoreTheme
        brandColor={store.brandColor}
        pageBackground={store.pageBackground}
        fontStyle={store.fontStyle}
        cornerStyle={store.cornerStyle}
      />
      <div className="mx-auto w-full max-w-2xl">
        <header className="bg-background/95 sticky top-0 z-30 flex items-center gap-2 border-b px-2 py-2 backdrop-blur">
          <Link
            href={`/${slug}`}
            aria-label={t("backToMenu")}
            className="hover:bg-muted flex size-10 items-center justify-center rounded-full"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <p className="min-w-0 truncate font-semibold">{store.name}</p>
        </header>
        <article className="bg-background m-3 rounded-2xl p-5 sm:p-6">
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          {doc.body && (
            <div className="text-foreground/90 mt-3 leading-relaxed">
              <RichText text={doc.body} />
            </div>
          )}
        </article>
        <p className="pb-8 text-center">
          <Link href={`/${slug}`} className="text-primary text-sm font-medium">
            {t("backToMenu")}
          </Link>
        </p>
      </div>
    </div>
  );
}
