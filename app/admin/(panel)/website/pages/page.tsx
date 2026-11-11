import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PagesManager } from "@/components/admin/pages/pages-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { listPages } from "@/lib/pages/data";

export default function WebsitePagesPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4 md:p-6">
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
        <h1 className="text-2xl font-bold">{t("heading")}</h1>
        <p className="text-muted-foreground text-sm">{t("lead")}</p>
      </div>
      <PagesManager storeSlug={store.slug} pages={pages} />
    </>
  );
}
