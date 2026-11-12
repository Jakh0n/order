import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { MenuImport } from "@/components/admin/menu/import/menu-import";
import { Skeleton } from "@/components/ui/skeleton";
import { aiConfigured } from "@/lib/ai/openai";
import { requireOwner } from "@/lib/auth/owner";

export default function MenuImportPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <ImportView />
      </Suspense>
    </div>
  );
}

async function ImportView() {
  const { store } = await requireOwner();
  const t = await getTranslations("menuImport");
  return (
    <>
      <div className="flex items-start gap-2">
        <Link
          href="/admin/menu"
          aria-label={t("back")}
          className="hover:bg-muted -ml-2 flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("lead")}</p>
        </div>
      </div>
      <MenuImport configured={aiConfigured()} currency={store.currency} />
    </>
  );
}
