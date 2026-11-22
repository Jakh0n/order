import { Check } from "lucide-react";
import { Manrope } from "next/font/google";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/landing/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Same display face as the landing (lib/brand.ts BRAND_FONTS)
const display = Manrope({ variable: "--font-brand-display", subsets: ["latin", "cyrillic"] });

/**
 * Login / signup / password reset frame. Phones: logo, heading, form.
 * Desktop: form on the left, a dark brand panel on the right (what the owner gets).
 */
export async function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("authShell");
  return (
    <div className={cn(display.variable, "flex min-h-dvh w-full bg-white")}>
      <div className="flex min-w-0 flex-1 flex-col px-4 pt-4 pb-8 sm:px-8 lg:px-12">
        <header className="flex h-12 items-center justify-between">
          <Link href="/" className="rounded-lg" aria-label={t("home")}>
            <Logo className="h-6" />
          </Link>
          <LanguageSwitcher />
        </header>

        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.02em] sm:text-[32px]">
              {title}
            </h1>
            {subtitle && <p className="text-muted-foreground mt-2 text-[15px]">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>

      <BrandPanel />
    </div>
  );
}

async function BrandPanel() {
  const t = await getTranslations("authShell");
  const benefits = [t("benefit1"), t("benefit2"), t("benefit3")];

  return (
    <aside className="sticky top-0 hidden h-dvh w-[46%] max-w-[640px] shrink-0 p-3 lg:block">
      <div className="bg-forest relative flex h-full flex-col overflow-hidden rounded-[28px] p-10 text-white xl:p-14">
        {/* Soft brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full opacity-40 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${BRAND.gradientFrom}, ${BRAND.gradientTo} 45%, transparent 70%)`,
          }}
        />

        <div className="relative mt-auto">
          <h2 className="font-display max-w-md text-4xl leading-[1.08] font-bold tracking-[-0.03em] xl:text-5xl">
            {t("panelTitle")}
          </h2>
          <ul className="mt-8 flex flex-col gap-3.5">
            {benefits.map((text) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-white/85">
                <span className="bg-primary flex size-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <OrderPreview />
        </div>
      </div>
    </aside>
  );
}

/** "This is what lands in your chat" — a sample order message */
async function OrderPreview() {
  const t = await getTranslations("authShell");
  return (
    <div className="mt-12 max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>{t("orderFrom")}</span>
        <span>{t("orderTime")}</span>
      </div>
      <p className="mt-2 font-semibold">{t("orderTitle")}</p>
      <p className="mt-1 text-sm text-white/70">{t("orderItems")}</p>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
        <span className="text-white/60">{t("orderMeta")}</span>
        <span className="font-semibold">{t("orderTotal")}</span>
      </div>
    </div>
  );
}
