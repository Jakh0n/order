import { BarChart3, Bike, Check, ChefHat, QrCode } from "lucide-react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { defaultLocale, isLocale, landingPath, type Locale, locales } from "@/i18n/config";
import QRCode from "qrcode";

import { JsonLd } from "@/components/json-ld";
import { getLandingDemo } from "@/lib/landing-demo";
import { Faq } from "@/components/landing/faq";
import { ChatCollapse } from "@/components/landing/chat-collapse";
import { LinkEverywhere } from "@/components/landing/link-everywhere";
import { Hero } from "@/components/landing/hero";
import { Logo } from "@/components/landing/logo";
import { Reveal } from "@/components/landing/motion-parts";
import { StoreSetup } from "@/components/landing/store-setup";
import { SiteNav } from "@/components/landing/site-nav";
import { StickyCta } from "@/components/landing/sticky-cta";
import { SiteAnalytics } from "@/components/site-analytics";
import { buttonVariants } from "@/components/ui/button";
import { siteOrigin } from "@/lib/app-url";
import { DEMO_STORE_SLUGS } from "@/lib/demo";
import { PRO_PRICE_USD, PRO_PRICE_YEARLY_USD } from "@/lib/plan";
import { cn } from "@/lib/utils";

// Tezda display face: geometric with round, even strokes like the "tezda" wordmark;
// has Cyrillic, so Russian headings don't fall back to another font (lib/brand.ts BRAND_FONTS)
const display = Manrope({
  variable: "--font-brand-display",
  subsets: ["latin", "cyrillic"],
});

const OG_LOCALES: Record<Locale, string> = { en: "en_US", ru: "ru_RU", uz: "uz_UZ" };

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const lang = isLocale(locale) ? locale : defaultLocale;
  const url = landingPath(lang);
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, landingPath(l)])),
        "x-default": landingPath(defaultLocale),
      },
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url,
      locale: OG_LOCALES[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => OG_LOCALES[l]),
    },
  };
}

/** Feature group icons, in the order of home.features.groups */
const GROUP_ICONS = [QrCode, ChefHat, Bike, BarChart3] as const;

const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const FREE_KEYS = ["i1", "i2", "i3", "i4", "i5", "i6"] as const;
const PRO_KEYS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

function PriceCard({
  name,
  price,
  per,
  note,
  intro,
  items,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  per: string;
  note?: string;
  intro: string;
  items: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[2rem] border-2 p-6 sm:rounded-[2.5rem] sm:p-8 lg:p-10",
        highlight ? "border-primary bg-primary/[0.03]" : "border-forest/10",
      )}
    >
      <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">{name}</h3>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-6xl font-bold tracking-[-0.04em] lg:text-7xl">
          {price}
        </span>
        <span className="text-forest/60">{per}</span>
      </p>
      {note && <p className="text-forest/60 mt-2 text-sm">{note}</p>}
      <p className="text-forest/80 mt-6 font-medium">{intro}</p>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="bg-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="text-forest/85">{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-9">
        <Link
          href="/signup"
          className={cn(
            buttonVariants({ size: "lg", variant: highlight ? "default" : "outline" }),
            "h-auto min-h-13 w-full rounded-full py-3 text-center text-base whitespace-normal",
          )}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export default async function Home() {
  const [t, tLegal, locale] = await Promise.all([
    getTranslations("home"),
    getTranslations("legal"),
    getLocale(),
  ]);
  // The animated phone shows the live demo store's real menu and the real order message
  const demo = await getLandingDemo(isLocale(locale) ? locale : defaultLocale);
  const siteHost = siteOrigin().replace(/^https?:\/\/(www\.)?/, "");
  const featureGroups = t.raw("features.groups") as {
    title: string;
    items: { t: string; pro?: boolean }[];
  }[];
  // Demo QR — the live demo store on this site's own domain (APP_URL), never a hardcoded one
  const demoUrl = `${siteOrigin()}/${DEMO_STORE_SLUGS[0]}`;
  const qr = await QRCode.toString(demoUrl, {
    type: "svg",
    margin: 0,
    color: { dark: "#12372a", light: "#00000000" },
  });

  return (
    <div className={cn(display.variable, "text-forest flex flex-1 flex-col bg-white")}>
      <JsonLd data={homeJsonLd(t("metaDescription"))} />
      <SiteNav />

      <main className="flex-1">
        <Hero demo={demo} link={`${siteHost}/${DEMO_STORE_SLUGS[0]}`} />

        {/* The problem: an order spread over a chat vs one complete order */}
        <section id="why" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                {t("problem.eyebrow")}
              </p>
              <h2 className="font-display mt-3 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                {t("problem.title")}
              </h2>
              <p className="text-forest/70 mt-5 text-lg leading-relaxed">{t("problem.body")}</p>
            </Reveal>
          </div>
          {/* Scroll story: the DM pile turns into one order (sticky phone) */}
          <ChatCollapse demo={demo} />
        </section>

        {/* How it works: the owner opens a store on their phone (sign up → menu from a photo → live) */}
        <section id="how" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <StoreSetup host={siteHost} />
          </div>
        </section>

        {/* Where the link goes: Instagram, Telegram channel, table QR, Google Maps */}
        {demo && (
          <section className="py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <LinkEverywhere
                demo={demo}
                link={demoUrl.replace(/^https?:\/\/(www\.)?/, "")}
                qrSvg={qr}
              />
            </div>
          </section>
        )}

        {/* What you get, grouped by the owner's day */}
        <section id="features" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                {t("features.title")}
              </h2>
              <p className="text-forest/70 mt-5 text-lg leading-relaxed">{t("features.lead")}</p>
            </Reveal>
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {featureGroups.map((group, i) => {
                const Icon = GROUP_ICONS[i];
                return (
                  <Reveal
                    key={group.title}
                    delay={(i % 2) * 0.08}
                    className="bg-mint/60 hover:bg-mint rounded-[2rem] p-6 transition-colors sm:p-8"
                  >
                    <span className="text-primary flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="font-display mt-5 text-2xl font-semibold tracking-tight">
                      {group.title}
                    </h3>
                    <ul className="mt-4 grid gap-2.5">
                      {group.items.map((item) => (
                        <li key={item.t} className="flex items-start gap-2.5">
                          <span className="bg-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white">
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                          <span className="text-forest/85">
                            {item.t}
                            {item.pro && (
                              <span className="bg-forest ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold tracking-wide text-white uppercase">
                                {t("features.pro")}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display max-w-3xl text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                {t("pricing.title")}
              </h2>
              <p className="text-forest/70 mt-5 max-w-2xl text-lg leading-relaxed">
                {t("pricing.lead")}
              </p>
            </Reveal>

            <div className="mt-10 grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
              <Reveal delay={0.1}>
                <PriceCard
                  name={t("pricing.freeName")}
                  price="$0"
                  per={t("pricing.freePer")}
                  intro={t("pricing.freeIntro")}
                  items={FREE_KEYS.map((key) => t(`pricing.${key}`))}
                  cta={t("pricing.cta")}
                />
              </Reveal>
              <Reveal delay={0.15}>
                <PriceCard
                  highlight
                  name={t("pricing.proName")}
                  price={`$${PRO_PRICE_USD}`}
                  per={t("pricing.proPer")}
                  note={t("pricing.proYearly", { price: `$${PRO_PRICE_YEARLY_USD}` })}
                  intro={t("pricing.proIntro")}
                  items={PRO_KEYS.map((key) => t(`pricing.${key}`))}
                  cta={t("pricing.proCta")}
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <Reveal>
              <h2 className="font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                {t("faq.title")}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <Faq items={FAQ_KEYS.map((n) => ({ q: t(`faq.q${n}`), a: t(`faq.a${n}`) }))} />
            </Reveal>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-4 pb-6 sm:px-6">
          <Reveal className="bg-forest relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[2.5rem] px-6 py-14 text-white sm:px-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-display max-w-lg text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-6xl">
                {t("final.title")}
              </h2>
              <p className="mt-5 text-lg text-white/70">{t("final.body")}</p>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-9 h-13 rounded-full px-7 text-base",
                )}
              >
                {t("final.cta")}
              </Link>
            </div>
            <div className="relative mx-auto hidden h-64 w-full max-w-sm sm:block" aria-hidden>
              {/* Three dishes from the live demo store */}
              {demo?.products.slice(0, 3).map((p, i) => (
                <Photo
                  key={p.id}
                  src={p.img}
                  className={
                    [
                      "top-6 left-0 -rotate-8",
                      "top-0 left-1/2 z-10 -translate-x-1/2",
                      "top-8 right-0 rotate-8",
                    ][i]
                  }
                />
              ))}
            </div>
          </Reveal>
        </section>
      </main>
      <StickyCta label={t("hero.cta")} note={t("sticky.note")} />
      <SiteAnalytics />

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="text-forest/55 text-sm">{t("footer.made")}</span>
        </div>
        <div className="text-forest/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/admin/login" className="hover:text-forest">
            {t("login")}
          </Link>
          <Link href="/signup" className="hover:text-forest">
            {t("signup")}
          </Link>
          <Link href="/privacy" className="hover:text-forest">
            {tLegal("footerPrivacy")}
          </Link>
          <Link href="/terms" className="hover:text-forest">
            {tLegal("footerTerms")}
          </Link>
          <span className="basis-full sm:basis-auto">{t("footer.rights")}</span>
        </div>
      </footer>
    </div>
  );
}

/** Organization + WebSite — tells search engines what Tezda is and links the brand to its logo. */
function homeJsonLd(description: string) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Tezda",
        url: origin,
        logo: `${origin}/icon.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Tezda",
        url: origin,
        description,
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: "Tezda",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: origin,
        description,
        offers: [
          { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
          {
            "@type": "Offer",
            name: "Pro",
            price: String(PRO_PRICE_USD),
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: String(PRO_PRICE_USD),
              priceCurrency: "USD",
              unitCode: "MON",
            },
          },
        ],
      },
    ],
  };
}

function Photo({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={cn(
        "ring-forest absolute size-40 overflow-hidden rounded-3xl shadow-2xl ring-4 lg:size-44",
        className,
      )}
    >
      <Image src={src} alt="" fill sizes="176px" className="object-cover" />
    </div>
  );
}
