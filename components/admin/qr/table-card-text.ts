import type { getTranslations } from "next-intl/server";

import type { TableCardText } from "./table-card";

type TableT = Awaited<ReturnType<typeof getTranslations<"table">>>;

/** Card texts from the "table" namespace (QR page preview and print sheet) */
export function tableCardText(t: TableT): TableCardText {
  return {
    table: t("table"),
    cta: t("scanToOrder"),
    steps: [t("steps.scan"), t("steps.choose"), t("steps.order")],
  };
}
