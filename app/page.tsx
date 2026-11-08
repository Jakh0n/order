import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";

export default async function Home() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("home.title")}</h1>
        <LanguageSwitcher />
      </div>
      <p className="text-muted-foreground">{t("home.subtitle")}</p>
      <p className="text-muted-foreground text-sm">{t("common.comingSoon")}</p>
    </main>
  );
}
