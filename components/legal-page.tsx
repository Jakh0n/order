import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { upgradeLink } from "@/lib/plan";

/** Date of the current Privacy Policy / Terms text (update when the text in messages/*.json changes) */
export const LEGAL_UPDATED = new Date("2026-11-13T00:00:00Z");

type Section = { title: string; body: string };

/** Privacy Policy and Terms: same layout, text from messages (legal.privacy / legal.terms) */
export async function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const [t, format] = await Promise.all([getTranslations("legal"), getFormatter()]);
  const sections = t.raw(`${doc}.sections`) as Section[];
  const support = upgradeLink("");
  const supportUser = support?.match(/t\.me\/([^?]+)/)?.[1];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Flami
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{t(`${doc}.title`)}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {t("updated", {
          date: format.dateTime(LEGAL_UPDATED, { dateStyle: "long", timeZone: "UTC" }),
        })}
      </p>
      <p className="mt-6 leading-relaxed">{t(`${doc}.intro`)}</p>
      {sections.map((s) => (
        <section key={s.title} className="mt-8">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <p className="text-foreground/85 mt-2 leading-relaxed">{s.body}</p>
        </section>
      ))}
      <p className="bg-muted mt-10 rounded-xl px-4 py-3 text-sm">
        {supportUser
          ? t.rich("contact", {
              link: () => (
                <a
                  href={`https://t.me/${supportUser}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium"
                >
                  @{supportUser}
                </a>
              ),
            })
          : t("contactNoLink")}
      </p>
      <nav className="text-muted-foreground mt-8 flex gap-4 text-sm">
        <Link href="/privacy" className="hover:text-foreground">
          {t("footerPrivacy")}
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          {t("footerTerms")}
        </Link>
      </nav>
    </main>
  );
}
