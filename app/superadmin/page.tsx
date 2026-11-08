import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/coming-soon";

export default async function SuperadminPage() {
  const t = await getTranslations("superadmin");
  return <ComingSoon title={t("title")} />;
}
