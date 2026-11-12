import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PagesManager } from "@/components/admin/pages/pages-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { listPages } from "@/lib/pages/data";

export default function WebsitePagesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Pages />
      </Suspense>
    </div>
  );
}

async function Pages() {
  const { store } = await requireOwner();
  const [pages, t] = await Promise.all([listPages(store.id), getTranslations("pages")]);
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">{t("lead")}</p>
      </div>
      <PagesManager storeSlug={store.slug} pages={pages} />
    </>
  );
}
