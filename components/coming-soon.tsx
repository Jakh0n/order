import { getTranslations } from "next-intl/server";

export async function ComingSoon({ title }: { title: string }) {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 px-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{t("comingSoon")}</p>
    </main>
  );
}
