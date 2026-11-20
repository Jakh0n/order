import { MapPin, Pin, Send } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import type { LandingDemo } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

import { Reveal } from "./motion-parts";
import { TELEGRAM_BLUE } from "./telegram";

/**
 * "One link, everywhere your customers already are": Instagram bio, a Telegram channel's pinned
 * post, the table QR card and Google Maps — each drawn with the demo store's real name and link.
 */
export async function LinkEverywhere({
  demo,
  link,
  qrSvg,
}: {
  demo: LandingDemo;
  /** "tezda.app/bahor-kafe" */
  link: string;
  /** QR of that link (server-rendered SVG) */
  qrSvg: string;
}) {
  const t = await getTranslations("home.places");
  const places = [
    { key: "instagram", mock: <InstagramBio demo={demo} link={link} bio={t("instagram.bio")} /> },
    {
      key: "telegram",
      mock: <TelegramPinned demo={demo} link={link} pinned={t("telegram.pinned")} />,
    },
    { key: "table", mock: <TableCard qrSvg={qrSvg} link={link} label={t("table.card")} /> },
    {
      key: "maps",
      mock: (
        <MapsCard demo={demo} link={link} order={t("maps.order")} category={t("maps.category")} />
      ),
    },
  ] as const;

  return (
    <div>
      <Reveal className="max-w-2xl">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">{t("eyebrow")}</p>
        <h2 className="font-display mt-3 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
          {t("title")}
        </h2>
        <p className="text-forest/70 mt-5 text-lg leading-relaxed">{t("lead")}</p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {places.map((place, i) => (
          <Reveal key={place.key} delay={i * 0.08} className="flex">
            <article className="bg-mint/60 flex w-full flex-col rounded-[2rem] p-5">
              <div className="flex h-56 items-center justify-center">{place.mock}</div>
              <h3 className="font-display mt-5 text-xl font-bold tracking-tight">
                {t(`${place.key}.title`)}
              </h3>
              <p className="text-forest/70 mt-1.5 text-[15px] leading-relaxed">
                {t(`${place.key}.text`)}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function Logo({ demo, className }: { demo: LandingDemo; className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white",
        className,
      )}
    >
      {demo.store.logoUrl ? (
        <Image src={demo.store.logoUrl} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        demo.store.name.charAt(0)
      )}
    </span>
  );
}

function InstagramBio({ demo, link, bio }: { demo: LandingDemo; link: string; bio: string }) {
  return (
    <div
      className="w-full max-w-[250px] rounded-2xl bg-white p-4 text-[#111] shadow-sm ring-1 ring-black/5"
      aria-hidden
    >
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] p-[2px]">
          <span className="block rounded-full bg-white p-[2px]">
            <Logo demo={demo} className="size-14" />
          </span>
        </span>
        {/* Posts / followers / following, as placeholders (no made-up numbers) */}
        <div className="grid flex-1 grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex flex-col items-center gap-1">
              <span className="h-2.5 w-6 rounded-full bg-neutral-300" />
              <span className="h-2 w-9 rounded-full bg-neutral-200" />
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[13px] font-semibold">{demo.store.name}</p>
      <p className="text-[12px] leading-snug text-black/70">{bio}</p>
      <p className="mt-1 truncate text-[12px] font-semibold text-[#00376b]">🔗 {link}</p>
    </div>
  );
}

function TelegramPinned({
  demo,
  link,
  pinned,
}: {
  demo: LandingDemo;
  link: string;
  pinned: string;
}) {
  return (
    <div
      className="w-full max-w-[250px] overflow-hidden rounded-2xl bg-white text-[#111] shadow-sm ring-1 ring-black/5"
      aria-hidden
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Logo demo={demo} className="size-9 text-sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{demo.store.name}</p>
          <span className="mt-1 block h-2 w-16 rounded-full bg-neutral-200" />
        </div>
      </div>
      <div className="flex items-center gap-2 border-y border-black/5 bg-neutral-50 px-3 py-2">
        <Pin className="size-3.5 shrink-0 rotate-45" style={{ color: TELEGRAM_BLUE }} />
        <div className="min-w-0 border-l-2 pl-2" style={{ borderColor: TELEGRAM_BLUE }}>
          <p className="text-[11px] font-semibold" style={{ color: TELEGRAM_BLUE }}>
            {pinned}
          </p>
          <p className="truncate text-[11px] text-black/70">{link}</p>
        </div>
      </div>
      <div
        className="flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold"
        style={{ color: TELEGRAM_BLUE }}
      >
        <Send className="size-3.5" />
        {link}
      </div>
    </div>
  );
}

function TableCard({ qrSvg, link, label }: { qrSvg: string; link: string; label: string }) {
  return (
    <div
      className="flex w-full max-w-[170px] -rotate-3 flex-col items-center rounded-2xl bg-white p-4 text-center shadow-[0_16px_30px_-16px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
      aria-hidden
    >
      <span className="bg-forest rounded-full px-3 py-1 text-[11px] font-bold text-white">№ 5</span>
      <div className="mt-3 size-24 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="mt-2 text-[11px] leading-snug font-semibold">{label}</p>
      <p className="mt-0.5 truncate text-[10px] text-black/45">{link}</p>
    </div>
  );
}

function MapsCard({
  demo,
  link,
  order,
  category,
}: {
  demo: LandingDemo;
  link: string;
  order: string;
  category: string;
}) {
  return (
    <div
      className="w-full max-w-[250px] overflow-hidden rounded-2xl bg-white text-[#111] shadow-sm ring-1 ring-black/5"
      aria-hidden
    >
      {/* A little map */}
      <div className="relative h-20 bg-[#e8eef0]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_46%,#fff_46%,#fff_52%,transparent_52%),linear-gradient(0deg,transparent_40%,#fff_40%,#fff_47%,transparent_47%),linear-gradient(35deg,transparent_60%,#cfe3c6_60%)]" />
        <MapPin className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-full fill-[#ea4335] text-[#a52714]" />
      </div>
      <div className="p-3">
        <p className="text-[14px] font-semibold">{demo.store.name}</p>
        <p className="text-[11px] text-black/50">{category}</p>
        <span className="mt-2.5 flex h-8 items-center justify-center rounded-full bg-[#1a73e8] text-[12px] font-semibold text-white">
          {order}
        </span>
        <p className="mt-1.5 truncate text-center text-[10px] text-black/45">{link}</p>
      </div>
    </div>
  );
}
