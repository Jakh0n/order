import { Download } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ProBadge } from "@/components/admin/upgrade";
import { buttonVariants } from "@/components/ui/button";

/** "Export CSV" — a plain download link (Pro); on Free it leads to the plan page */
export async function ExportButton({ href, pro }: { href: string; pro: boolean }) {
  const t = await getTranslations("export");
  if (!pro) {
    return (
      <span className="flex items-center gap-2">
        <Link
          href="/admin/plan"
          className={buttonVariants({
            variant: "outline",
            className: "text-muted-foreground h-10",
          })}
        >
          <Download aria-hidden />
          {t("button")}
        </Link>
        <ProBadge />
      </span>
    );
  }
  return (
    <a href={href} download className={buttonVariants({ variant: "outline", className: "h-10" })}>
      <Download aria-hidden />
      {t("button")}
    </a>
  );
}
