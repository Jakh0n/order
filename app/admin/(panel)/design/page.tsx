import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { DesignForm } from "@/components/admin/design/design-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { asMenuLayout, asPageBackground } from "@/lib/design";

export default function DesignPage() {
  return (
    <div className="flex max-w-6xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Design />
      </Suspense>
    </div>
  );
}

async function Design() {
  const { store } = await requireOwner();
  const [design, t] = await Promise.all([
    prisma.store.findUnique({
      where: { id: store.id },
      select: {
        name: true,
        logoUrl: true,
        coverUrl: true,
        description: true,
        announcement: true,
        brandColor: true,
        pageBackground: true,
        menuLayout: true,
      },
    }),
    getTranslations("design"),
  ]);
  if (!design) notFound();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("lead")}</p>
      </div>
      <DesignForm
        slug={store.slug}
        defaultValues={{
          ...design,
          description: design.description ?? "",
          announcement: design.announcement ?? "",
          pageBackground: asPageBackground(design.pageBackground),
          menuLayout: asMenuLayout(design.menuLayout),
        }}
      />
    </>
  );
}
