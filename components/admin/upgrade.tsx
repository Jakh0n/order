import { Gem, Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shown in place of a Pro feature on the Free plan */
export async function UpgradeCard({
  title,
  text,
  className,
}: {
  title: string;
  text: string;
  className?: string;
}) {
  const t = await getTranslations("plan");
  return (
    <section
      className={cn(
        "border-primary/25 from-primary/5 flex flex-col items-start gap-3 rounded-xl border bg-gradient-to-br to-transparent p-5",
        className,
      )}
    >
      <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
        <Lock className="size-3.5" aria-hidden />
        {t("proFeature")}
      </span>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">{text}</p>
      </div>
      <Link href="/admin/plan" className={buttonVariants({ className: "gap-2" })}>
        <Gem className="size-4" aria-hidden />
        {t("seePro")}
      </Link>
    </section>
  );
}

/** One-line nudge (e.g. order history limit reached) */
export async function UpgradeBanner({ text }: { text: string }) {
  const t = await getTranslations("plan");
  return (
    <div className="border-primary/25 bg-primary/5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm">
      <Gem className="text-primary size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{text}</p>
      <Link href="/admin/plan" className="text-primary shrink-0 font-semibold">
        {t("seePro")}
      </Link>
    </div>
  );
}

/** Small "Pro" pill next to a locked setting */
export async function ProBadge() {
  const t = await getTranslations("plan");
  return (
    <Link
      href="/admin/plan"
      className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
    >
      <Lock className="size-3" aria-hidden />
      {t("pro")}
    </Link>
  );
}
