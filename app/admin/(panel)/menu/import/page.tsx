import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { MenuImport } from "@/components/admin/menu/import/menu-import";
import { Skeleton } from "@/components/ui/skeleton";
import { aiConfigured } from "@/lib/ai/openai";
import { requireOwner } from "@/lib/auth/owner";

// Reading a big menu with AI can take ~1 minute; Server Actions on this page get up to 2
export const maxDuration = 120;

export default function MenuImportPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">{t("lead")}</p>
        </div>
      </div>
      <MenuImport configured={aiConfigured()} currency={store.currency} />
    </>
  );
}
