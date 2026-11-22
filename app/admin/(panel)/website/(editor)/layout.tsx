import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DesignForm } from "@/components/admin/design/design-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { DESIGN_SELECT, designFormValues } from "@/lib/settings/design-values";

/**
 * Website editor (Storefront | Checkout | Appearance | Menu). The form lives here, in the
 * shared layout, so switching tabs (routes) keeps unsaved changes. The tab pages are empty.
 */
export default function WebsiteEditorLayout({ children }: LayoutProps<"/admin/website">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pt-0 pb-5 md:px-8 md:pb-8">
      <Suspense fallback={<Skeleton className="mt-6 h-[600px] w-full" />}>
        <Design />
      </Suspense>
      {children}
    </div>
  );
}

async function Design() {
  const { store } = await requireOwner();
  const [design, categories] = await Promise.all([
    prisma.store.findUnique({ where: { id: store.id }, select: DESIGN_SELECT }),
    prisma.category.findMany({
      where: { storeId: store.id, isActive: true },
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!design) notFound();

  return (
    <DesignForm
      slug={store.slug}
      categories={categories}
      defaultValues={designFormValues(design)}
    />
  );
}
