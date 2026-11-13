import {
  Bike,
  Check,
  Clock,
  Coins,
  Copy,
  LayoutList,
  PackageCheck,
  QrCode,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";

import { JsonLd } from "@/components/json-ld";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { Logo } from "@/components/landing/logo";
import { Reveal, ScrollWords, StepsTrack } from "@/components/landing/motion-parts";
import { OrderMessage } from "@/components/landing/order-message";
import { SiteNav } from "@/components/landing/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { siteOrigin } from "@/lib/app-url";
import {
  FOUNDING_PRO_MONTHS,
  FOUNDING_STORES,
  PRO_PRICE_USD,
  PRO_PRICE_YEARLY_USD,
} from "@/lib/plan";
import { cn } from "@/lib/utils";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: { canonical: "/" },
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), url: "/" },
  };
}

const FEATURES = [
  { key: "menu", icon: UtensilsCrossed },
  { key: "track", icon: PackageCheck },
  { key: "board", icon: LayoutList },
  { key: "delivery", icon: Bike },
  { key: "payment", icon: Wallet },
  { key: "hours", icon: Clock },
  { key: "qr", icon: QrCode },
  { key: "currency", icon: Coins },
] as const;

const FAQ_KEYS = [1, 2, 3, 4, 5, 6] as const;
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
        "flex h-full flex-col rounded-[2.5rem] border-2 p-7 sm:p-10",
        highlight ? "border-primary bg-primary/[0.03]" : "border-forest/10",
      )}
    >
      <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">{name}</h3>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-6xl font-bold tracking-[-0.04em] sm:text-7xl">
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
            "h-13 w-full rounded-full text-base",
          )}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export default async function Home() {
  const [t, tLegal] = await Promise.all([getTranslations("home"), getTranslations("legal")]);
  // Static demo QR — points at the live demo store
  const qr = await QRCode.toString("https://flami.org/flami-grill", {
    type: "svg",
    margin: 0,
    color: { dark: "#12372a", light: "#00000000" },
  });

  return (
    <div className={cn(display.variable, "text-forest flex flex-1 flex-col bg-white")}>
      <JsonLd data={homeJsonLd(t("metaDescription"))} />
      <SiteNav />

      <main className="flex-1">
        <Hero />

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <h2 className="font-display max-w-2xl text-4xl font-bold tracking-[-0.03em] sm:text-5xl md:mx-auto md:text-center">
                {t("steps.title")}
              </h2>
            </Reveal>
            <div className="mt-14 sm:mt-20">
              <StepsTrack
                steps={[
                  {
                    title: t("steps.s1.title"),
                    body: t("steps.s1.body"),
                    visual: (
                      <MiniCard>
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                            <Image
                              src="/landing/fries.jpg"
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-semibold">Fries</p>
                            <p className="text-forest/60 text-xs tabular-nums">$3.99</p>
                          </div>
                          <span className="text-forest/60 flex items-center gap-1.5 text-[11px]">
                            {t("steps.v1Stock")}
                            <span className="bg-primary flex h-4 w-7 items-center justify-end rounded-full p-0.5">
                              <span className="size-3 rounded-full bg-white" />
                            </span>
                          </span>
                        </div>
                      </MiniCard>
                    ),
                  },
                  {
                    title: t("steps.s2.title"),
                    body: t("steps.s2.body"),
                    visual: (
                      <MiniCard>
                        <div className="flex items-center gap-3">
                          <div
                            className="size-14 shrink-0 [&>svg]:size-full"
                            dangerouslySetInnerHTML={{ __html: qr }}
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-semibold">flami.org/flami-grill</p>
                            <p className="text-primary mt-1 flex items-center gap-1 text-xs font-medium">
                              <Copy className="size-3" />
                              {t("steps.v2Copy")}
                            </p>
                          </div>
                        </div>
                      </MiniCard>
                    ),
                  },
                  {
                    title: t("steps.s3.title"),
                    body: t("steps.s3.body"),
                    visual: (
                      <div className="bg-chat w-full max-w-[272px] rounded-2xl p-3">
                        <div className="bg-bubble ml-auto w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-left text-xs leading-relaxed text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
                          <b>Order #1043</b>
                          <span className="mt-1 flex justify-between">
                            <span>
                              <b>2x</b> Doner Combo
                            </span>
                            <span className="tabular-nums">$25.98</span>
                          </span>
                          <b className="flex justify-between">
                            <span>Total</span>
                            <span className="tabular-nums">$28.97</span>
                          </b>
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <h2 className="font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
                {t("features.title")}
              </h2>
              <p className="text-forest/70 mt-5 text-lg leading-relaxed">{t("features.lead")}</p>
            </Reveal>

            <div className="mt-14 grid gap-12 lg:grid-cols-[5fr_6fr] lg:gap-16">
              <Reveal className="lg:sticky lg:top-24 lg:self-start">
                <div className="bg-mint rounded-[2.5rem] p-6 sm:p-10">
                  <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    {t("features.chatTitle")}
                  </h3>
                  <p className="text-forest/70 mt-3 max-w-sm leading-relaxed">
                    {t("features.chatBody")}
                  </p>
                  <div className="bg-chat mt-8 rounded-3xl p-4 sm:p-6">
                    <OrderMessage className="ml-auto max-w-[300px]" />
                  </div>
                </div>
              </Reveal>

              <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:pt-4">
                {FEATURES.map(({ key, icon: Icon }, i) => (
                  <Reveal as="li" key={key} delay={(i % 2) * 0.08}>
                    <span className="bg-mint text-primary flex size-11 items-center justify-center rounded-2xl">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{t(`features.${key}.title`)}</h3>
                    <p className="text-forest/65 mt-1.5 leading-relaxed">
                      {t(`features.${key}.body`)}
                    </p>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <ScrollWords
              text={t("audience.text")}
              className="font-display text-3xl leading-[1.15] font-semibold tracking-[-0.025em] sm:text-5xl"
            />
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

            <Reveal delay={0.05}>
              <p className="bg-primary/10 text-forest mt-10 flex flex-col gap-1 rounded-3xl px-5 py-4 sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:px-6">
                <span className="bg-primary w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
                  {t("pricing.foundingLabel")}
                </span>
                <span className="text-forest/85 text-sm sm:text-base">
                  {t("pricing.founding", {
                    count: FOUNDING_STORES,
                    months: FOUNDING_PRO_MONTHS,
                    price: `$${PRO_PRICE_USD}`,
                  })}
                </span>
              </p>
            </Reveal>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
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
              <Photo src="/landing/doner.jpg" className="top-6 left-0 -rotate-8" />
              <Photo src="/landing/shish.jpg" className="top-0 left-1/2 z-10 -translate-x-1/2" />
              <Photo src="/landing/ayran.jpg" className="top-8 right-0 rotate-8" />
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="text-forest/55 text-sm">{t("footer.made")}</span>
        </div>
        <div className="text-forest/60 flex items-center gap-5 text-sm">
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
          <span>{t("footer.rights")}</span>
        </div>
      </footer>
    </div>
  );
}

/** Organization + WebSite — tells search engines what Flami is and links the brand to its logo. */
function homeJsonLd(description: string) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Flami",
        url: origin,
        logo: `${origin}/icon.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Flami",
        url: origin,
        description,
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: "Flami",
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

function MiniCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="ring-forest/10 w-full max-w-[272px] rounded-2xl bg-white p-3 shadow-[0_12px_30px_-18px_rgba(18,55,42,0.35)] ring-1">
      {children}
    </div>
  );
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
