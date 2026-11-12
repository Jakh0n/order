import { Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AddCategoryForm } from "@/components/admin/menu/add-category-form";
import { CategoryCard } from "@/components/admin/menu/category-card";
import { SetupChecklist } from "@/components/admin/setup-checklist";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { getAdminMenu } from "@/lib/menu/admin-data";

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
    <div className="flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{tAdmin("products")}</h1>
        {/* AI: photo of a paper menu → dishes */}
        <Link
          href="/admin/menu/import"
          className={buttonVariants({ variant: "outline", className: "gap-2" })}
        >
          <Sparkles className="size-4" aria-hidden />
          {tImport("button")}
        </Link>
      </div>
      <SetupChecklist storeId={store.id} slug={store.slug} />
      <AddCategoryForm />
      {categories.length === 0 && (
        <p className="text-muted-foreground py-10 text-center">{t("emptyMenu")}</p>
      )}
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} categoryIds={categoryIds} />
      ))}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
