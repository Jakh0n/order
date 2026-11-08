import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/coming-soon";

export default async function AdminMenuPage() {
  const t = await getTranslations("admin");
  return <ComingSoon title={t("menu")} />;
}
