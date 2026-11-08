import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";

export default async function OrderNotFound() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t("order.notFound")}</h1>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        {t("common.home")}
      </Link>
    </main>
  );
}
