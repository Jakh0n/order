import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/coming-soon";

export default async function OrderPage() {
  const t = await getTranslations("order");
  return <ComingSoon title={t("status")} />;
}
