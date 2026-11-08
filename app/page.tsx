import { MessageCircle, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const t = await getTranslations("home");
  const features = [
    { icon: Smartphone, text: t("feature1") },
    { icon: MessageCircle, text: t("feature2") },
    { icon: Wallet, text: t("feature3") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <span className="text-xl font-bold">{t("title")}</span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/admin/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("login")}
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-5 py-8 sm:py-16">
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{t("subtitle")}</h1>
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "lg" }), "h-12 self-start px-6 text-base")}
        >
          {t("signup")}
        </Link>
      </section>

      <ul className="grid gap-3 sm:grid-cols-3">
        {features.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-xl border p-4">
            <Icon className="text-primary size-5 shrink-0" />
            <span className="text-sm font-medium">{text}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
