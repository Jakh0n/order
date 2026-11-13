import { Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ExportButton } from "@/components/admin/export-button";
import { AddCategoryForm } from "@/components/admin/menu/add-category-form";
import { CategoryCard } from "@/components/admin/menu/category-card";
import { PageHeader, PageShell } from "@/components/admin/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { getAdminMenu } from "@/lib/menu/admin-data";
import { isPro } from "@/lib/plan";

export default function AdminMenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <AdminMenu />
    </Suspense>
  );
}

async function AdminMenu() {
  const { store } = await requireOwner();
  const [categories, t, tAdmin] = await Promise.all([
    getAdminMenu(store.id),
    getTranslations("adminMenu"),
    getTranslations("admin"),
  ]);
  const tImport = await getTranslations("menuImport");
  const categoryIds = categories.map((c) => c.id);

  return (
    <PageShell>
      <PageHeader
        title={tAdmin("products")}
        description={tAdmin("descriptions.products")}
        actions={
          <>
            {/* AI photo or CSV file → dishes */}
            <Link
              href="/admin/menu/import"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Sparkles className="size-4" aria-hidden />
              {tImport("button")}
            </Link>
            {categories.length > 0 && <ExportButton href="/admin/export/menu" pro={isPro(store)} />}
          </>
        }
      />
      <AddCategoryForm />
      {categories.length === 0 && (
        <p className="text-muted-foreground py-10 text-center">{t("emptyMenu")}</p>
      )}
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} categoryIds={categoryIds} />
      ))}
    </PageShell>
  );
}

function MenuSkeleton() {
  return (
    <PageShell>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </PageShell>
  );
}
