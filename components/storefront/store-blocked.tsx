import { getTranslations } from "next-intl/server";

/** Superadmin bloklagan do'kon — menyu va checkout o'rniga */
export async function StoreBlocked({ name }: { name: string }) {
  const t = await getTranslations("store");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{name}</h1>
      <p className="text-muted-foreground">{t("blocked")}</p>
    </main>
  );
}
