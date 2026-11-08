import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/coming-soon";

export default async function StorePage() {
  const t = await getTranslations("menu");
  return <ComingSoon title={t("title")} />;
}
