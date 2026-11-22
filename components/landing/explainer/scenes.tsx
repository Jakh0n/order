"use client";

import { Camera, Check, Copy, QrCode, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import type { LandingDemo } from "@/lib/landing-demo";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { CHAT_TIMES } from "../chat-story";
import { CheckoutScreen, MenuScreen, SendScreen } from "../phone-screens";
import {
  TELEGRAM_BLUE,
  TelegramAvatar,
  TelegramBubble,
  TelegramComposer,
  TelegramDate,
  TelegramHeader,
  TelegramText,
  TelegramWallpaper,
} from "../telegram";
import { ramp } from "./timeline";

// Every scene is drawn from `t` (seconds into the scene), so pausing the clock freezes it exactly.
// Screens sit under the phone's own status bar (h-9).

export interface SceneProps {
  t: number;
  demo: LandingDemo;
  /** "tezda.app/bahor-kafe" */
  link: string;
}

/** Fade + rise in over 0.35s from `at` */
function enter(t: number, at: number, dy = 14) {
  const p = ramp(t, at, at + 0.35);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
}

function useMoney(demo: LandingDemo) {
  return (minor: number) => formatMoney(minor, demo.store.currency);
}

// ---------- 1. Hook: the phone never stops ----------

const UNREAD_SHARE = [0.3, 0.22, 0.17, 0.13, 0.1, 0.08];

export function HookScene({ t }: SceneProps) {
  const tx = useTranslations("home.explainer");
  const tDemo = useTranslations("home.demo");
  const names = tx.raw("chats") as string[];
  const messages = useTranslations("home.problem").raw("messages") as string[];
  const unread = Math.round(3 + 44 * ramp(t, 0.3, 5.4));
  // One banner at a time drops in from the top
  const banner = Math.min(names.length - 1, Math.max(0, Math.floor((t - 0.4) / 0.9)));
  const bannerIn = ramp(t, 0.4 + banner * 0.9, 0.4 + banner * 0.9 + 0.25);

  return (
    <div className="flex h-full flex-col bg-white pt-9">
      <div className="flex items-center justify-between border-b border-black/5 px-4 pb-2">
        <p className="text-[17px] font-bold">{tDemo("tgChats")}</p>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white tabular-nums"
          style={{ backgroundColor: TELEGRAM_BLUE }}
        >
          {tx("unread", { count: unread })}
        </span>
      </div>
      <ul className="flex flex-col">
        {names.map((name, i) => (
          <li key={name} className="flex items-center gap-2.5 px-3 py-2">
            <TelegramAvatar name={name} />
            <div className="min-w-0 flex-1 border-b border-black/5 pb-2">
              <p className="flex justify-between text-[12.5px] font-semibold">
                {name}
                <span className="text-[10px] font-normal text-black/40">
                  {CHAT_TIMES[CHAT_TIMES.length - 1 - (i % CHAT_TIMES.length)]}
                </span>
              </p>
              <p className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-black/50">
                <span className="truncate">{messages[(i * 3) % messages.length]}</span>
                <span
                  className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[9.5px] font-bold text-white tabular-nums"
                  style={{ backgroundColor: TELEGRAM_BLUE }}
                >
                  {Math.max(1, Math.round(unread * UNREAD_SHARE[i % UNREAD_SHARE.length]))}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      {t > 0.4 && (
        <div
          className="absolute inset-x-2 top-9 z-20 flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
          style={{ opacity: bannerIn, transform: `translateY(${(1 - bannerIn) * -40}px)` }}
        >
          <TelegramAvatar name={names[banner]} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold">{names[banner]}</p>
            <p className="truncate text-[11px] text-black/60">
              {messages[(banner * 3) % messages.length]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 2–3. One order over many messages, then one complete message ----------

/** Message i arrives at this second of the "dm" scene */
export const DM_AT = (i: number) => 0.4 + i * 1.35;

export function DmChat({
  demo,
  shown,
  sinceLast,
  collapse = 0,
  order = 0,
}: {
  demo: LandingDemo;
  /** Messages already sent */
  shown: number;
  /** Seconds since the last one arrived (its slide-in) */
  sinceLast: number;
  /** 0..1 the pile squeezes away */
  collapse?: number;
  /** 0..1 the complete order message grows in */
  order?: number;
}) {
  const tDemo = useTranslations("home.demo");
  const messages = useTranslations("home.problem").raw("messages") as string[];
  const customer = demo.customer.name;
  const last = ramp(sinceLast, 0, 0.35);

  return (
    <div className="flex h-full flex-col bg-[#f7f7f7] pt-9">
      <TelegramHeader
        back={tDemo("tgChats")}
        unread={3}
        title={customer}
        subtitle={tDemo("tgOnline")}
        subtitleOnline
        avatar={<TelegramAvatar name={customer} />}
      />
      <TelegramWallpaper className="min-h-0 flex-1 overflow-hidden">
        <div className="relative flex h-full flex-col justify-end px-2.5 pt-2 pb-2">
          <TelegramDate label={tDemo("tgToday")} />
          <ul
            className="flex origin-bottom flex-col gap-1"
            style={{
              opacity: 1 - collapse,
              transform: `scale(${1 - collapse * 0.65})`,
              filter: `blur(${collapse * 6}px)`,
            }}
          >
            {messages.slice(0, shown).map((text, i) => (
              <li
                key={i}
                style={
                  i === shown - 1
                    ? { opacity: last, transform: `translateY(${(1 - last) * 14}px)` }
                    : undefined
                }
              >
                <TelegramBubble
                  outgoing={i % 2 === 1}
                  time={CHAT_TIMES[i] ?? ""}
                  className="text-[12.5px]"
                >
                  {text}
                </TelegramBubble>
              </li>
            ))}
          </ul>
          {order > 0 && (
            <div
              className="absolute inset-x-2.5 bottom-2 origin-bottom"
              style={{ opacity: order, transform: `scale(${0.7 + order * 0.3})` }}
            >
              <TelegramBubble
                outgoing={false}
                time={CHAT_TIMES[0]}
                className="text-[9.5px] leading-[1.35]"
              >
                <TelegramText text={demo.message} />
              </TelegramBubble>
            </div>
          )}
        </div>
      </TelegramWallpaper>
      <TelegramComposer placeholder={tDemo("tgPlaceholder")} />
    </div>
  );
}

export function dmShown(t: number, total: number): number {
  let n = 0;
  while (n < total && DM_AT(n) <= t) n++;
  return n;
}

export function DmScene({ t, demo }: SceneProps) {
  const total = (useTranslations("home.problem").raw("messages") as string[]).length;
  const shown = Math.max(1, dmShown(t, total));
  return <DmChat demo={demo} shown={shown} sinceLast={t - DM_AT(shown - 1)} />;
}

export function CollapseScene({ t, demo }: SceneProps) {
  const total = (useTranslations("home.problem").raw("messages") as string[]).length;
  return (
    <DmChat
      demo={demo}
      shown={total}
      sinceLast={9}
      collapse={ramp(t, 0.3, 1.5)}
      order={ramp(t, 1.1, 2.1)}
    />
  );
}

// ---------- 4. Open a store: name, link, channel ----------

function typed(text: string, t: number, from: number, to: number) {
  return text.slice(0, Math.round(ramp(t, from, to) * text.length));
}

export function OpenScene({ t, demo, link }: SceneProps) {
  const tSign = useTranslations("signup");
  const tSetup = useTranslations("home.setup");
  const [host, slug] = splitLink(link);
  const name = typed(demo.store.name, t, 0.5, 2);
  const slugText = typed(slug, t, 2.2, 3.3);
  const username = typed(`@${slug.replace(/-/g, "_")}`, t, 4.6, 5.8);
  const pressed = t > 6.2 && t < 6.6;
  const live = ramp(t, 6.8, 7.4);

  return (
    <div className="relative h-full bg-white px-4 pt-12 text-[#111]">
      <p className="text-[11px] text-black/45">{tSign("step", { current: 2, total: 2 })}</p>
      <p className="mt-0.5 text-[17px] font-bold">{tSign("title")}</p>
      <div className="mt-4 flex flex-col gap-3">
        <FormField label={tSign("storeName")} value={name} focused={t < 2.1} />
        <div>
          <p className="mb-1 text-[10.5px] font-medium text-black/55">{tSign("slug")}</p>
          <div
            className={cn(
              "flex h-10 items-center rounded-xl bg-neutral-50 px-3 text-[12.5px] ring-1",
              t > 2.1 && t < 3.5 ? "ring-primary ring-2" : "ring-black/10",
            )}
          >
            <span className="text-black/40">{host}/</span>
            <span className="font-medium">{slugText}</span>
            <span
              className="ml-auto flex items-center gap-0.5 text-[10.5px] font-semibold text-emerald-600"
              style={{ opacity: ramp(t, 3.5, 3.8) }}
            >
              <Check className="size-3.5" strokeWidth={3} />
              {tSign("slugAvailable")}
            </span>
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10.5px] font-medium text-black/55">{tSign("channel")}</p>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/5 p-0.5 text-center text-[11px] font-semibold">
            <span
              className={cn("rounded-lg py-1.5", t > 4 ? "bg-white shadow-sm" : "text-black/45")}
            >
              {tSign("telegram")}
            </span>
            <span className="py-1.5 text-black/45">{tSign("whatsapp")}</span>
          </div>
        </div>
        <FormField label={tSign("telegramUsername")} value={username} focused={t > 4.5 && t < 6} />
      </div>
      <div
        className={cn(
          "bg-primary absolute inset-x-4 bottom-6 flex h-11 items-center justify-center rounded-2xl text-[13px] font-semibold text-white shadow-lg shadow-red-900/20 transition-transform",
          pressed && "scale-95",
        )}
      >
        {tSign("submit")}
      </div>

      {/* Live */}
      {live > 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center"
          style={{ opacity: live }}
        >
          <span
            className="flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white"
            style={{ transform: `scale(${0.6 + 0.4 * ramp(t, 6.9, 7.5)})` }}
          >
            <Check className="size-8" strokeWidth={3} />
          </span>
          <p className="text-[16px] font-bold">{tSetup("ready")}</p>
          <p className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] font-semibold">
            {host}/<span className="text-primary">{slug}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function splitLink(link: string): [string, string] {
  const i = link.lastIndexOf("/");
  return [link.slice(0, i), link.slice(i + 1)];
}

function FormField({ label, value, focused }: { label: string; value: string; focused: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-medium text-black/55">{label}</p>
      <div
        className={cn(
          "flex h-10 items-center rounded-xl bg-neutral-50 px-3 text-[12.5px] font-medium ring-1",
          focused ? "ring-primary ring-2" : "ring-black/10",
        )}
      >
        {value}
        {focused && <span className="bg-primary ml-px h-4 w-px" />}
      </div>
    </div>
  );
}

// ---------- 5. Menu from a photo ----------

export function MenuScene({ t, demo }: SceneProps) {
  const tx = useTranslations("home.explainer");
  const tSetup = useTranslations("home.setup");
  const money = useMoney(demo);
  const flash = t < 2.1 ? ramp(t, 1.9, 2.05) : 1 - ramp(t, 2.1, 2.6);
  const camera = t < 2.3;
  const scan = ((t - 2.4) % 1.2) / 1.2;
  const reading = t < 4.6;

  return (
    <div className="relative h-full overflow-hidden">
      {camera ? (
        <div className="flex h-full flex-col items-center justify-center bg-[#111] px-6">
          <PaperMenu demo={demo} money={money} title={tSetup("paperTitle")} />
          <span
            className={cn(
              "absolute bottom-8 size-14 rounded-full border-4 border-white bg-white/90 transition-transform",
              t > 1.7 && t < 2 && "scale-90",
            )}
          />
          <Camera className="absolute top-12 right-5 size-5 text-white/70" />
        </div>
      ) : (
        <div className="flex h-full flex-col bg-white px-4 pt-11 text-[#111]">
          <p className="text-[15px] font-bold">{tSetup("importTitle")}</p>
          <div className="relative mt-3 h-24 overflow-hidden rounded-xl bg-[#111] p-2">
            <div className="origin-top scale-[0.45]">
              <PaperMenu demo={demo} money={money} title={tSetup("paperTitle")} />
            </div>
            {reading && (
              <span
                className="bg-primary absolute inset-x-0 h-0.5 shadow-[0_0_12px_4px_rgba(239,68,68,0.6)]"
                style={{ top: `${scan * 100}%` }}
              />
            )}
          </div>
          <p className="mt-3 text-[11.5px] font-semibold text-black/55">
            {reading ? tx("reading") : tSetup("found", { count: demo.products.length })}
          </p>
          {reading && (
            <ul className="mt-2 flex flex-col gap-1.5" aria-hidden>
              {demo.products.map((p) => (
                <li
                  key={p.id}
                  className="flex animate-pulse items-center gap-2.5 rounded-xl bg-neutral-50 p-1.5"
                >
                  <span className="size-10 rounded-lg bg-neutral-200" />
                  <span className="flex flex-1 flex-col gap-1.5">
                    <span className="h-2.5 w-2/3 rounded bg-neutral-200" />
                    <span className="h-2 w-1/3 rounded bg-neutral-200" />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <ul className={cn("mt-2 flex flex-col gap-1.5", reading && "hidden")}>
            {demo.products.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-2.5 rounded-xl bg-neutral-50 p-1.5 ring-1 ring-black/5"
                style={enter(t, 4.7 + i * 0.6)}
              >
                <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                  <Image src={p.img} alt="" fill sizes="40px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold">{p.name}</span>
                  <span className="block text-[11px] text-black/55 tabular-nums">
                    {money(p.price)}
                  </span>
                </span>
                <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
              </li>
            ))}
          </ul>
          <div
            className={cn(
              "bg-primary absolute inset-x-4 bottom-6 flex h-11 items-center justify-center rounded-2xl text-[13px] font-semibold text-white shadow-lg shadow-red-900/20 transition-[transform,opacity]",
              t > 8.6 && t < 9 && "scale-95",
            )}
            style={{ opacity: ramp(t, 7.2, 7.6) }}
          >
            {tSetup("addToMenu")}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: flash }} />
    </div>
  );
}

function PaperMenu({
  demo,
  money,
  title,
}: {
  demo: LandingDemo;
  money: (minor: number) => string;
  title: string;
}) {
  return (
    <div className="w-[210px] -rotate-2 rounded-md bg-[#f6efe1] px-4 py-3 font-serif text-[#3b2f22] shadow-xl">
      <p className="text-center text-[15px] font-bold tracking-wide uppercase">{title}</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-[12px] italic">
        {demo.products.map((p) => (
          <li key={p.id} className="flex items-baseline gap-1">
            <span className="truncate">{p.name}</span>
            <span className="min-w-3 flex-1 border-b border-dotted border-[#3b2f22]/40" />
            <span className="shrink-0 tabular-nums">{money(p.price)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- 6. Share the link ----------

const SHARE_AT = [1.2, 3.2, 5.2];

export function ShareScene({ t, demo, link }: SceneProps) {
  const tx = useTranslations("home.explainer");
  const tPlaces = useTranslations("home.places");
  const places = [
    {
      key: "instagram",
      icon: <Camera className="size-4" />,
      tone: "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]",
    },
    { key: "telegram", icon: <Send className="size-4" />, tone: "bg-[#229ED9]" },
    { key: "table", icon: <QrCode className="size-4" />, tone: "bg-[#1c211f]" },
  ] as const;

  return (
    <div className="relative flex h-full flex-col gap-3 bg-neutral-50 px-3 pt-11 text-[#111]">
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <p className="text-[10px] font-semibold tracking-wide text-black/45 uppercase">
          {tx("linkTitle")}
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
            {demo.store.logoUrl && (
              <Image src={demo.store.logoUrl} alt="" fill sizes="40px" className="object-cover" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">{demo.store.name}</p>
            <p className="text-primary truncate text-[11px] font-semibold">{link}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold">
            <Copy className="size-3" />
            {tx("copy")}
          </span>
        </div>
      </div>

      {places.map((place, i) => {
        const at = SHARE_AT[i];
        const done = t > at + 0.9;
        return (
          <div
            key={place.key}
            className="relative flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
            style={enter(t, at - 0.4)}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl text-white",
                place.tone,
              )}
            >
              {place.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold">{tPlaces(`${place.key}.title`)}</p>
              <p
                className="text-primary truncate text-[10.5px] font-semibold"
                style={{ opacity: ramp(t, at + 0.6, at + 0.9) }}
              >
                {link}
              </p>
            </div>
            <span
              className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white"
              style={{ opacity: done ? 1 : 0, transform: `scale(${done ? 1 : 0.5})` }}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            {/* The link flies down from the card above */}
            {t > at && t < at + 0.7 && (
              <span
                className="bg-primary absolute left-14 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                style={{
                  top: `${-60 * (1 - ramp(t, at, at + 0.6))}px`,
                  opacity: 1 - ramp(t, at + 0.5, at + 0.7),
                }}
              >
                {link}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- 7. The customer orders ----------

const ORDER_STEPS = [0, 1.4, 2.25, 3.1, 4.1, 4.9, 8.2, 9.6, 10.6];

export function OrderScene({ t, demo }: SceneProps) {
  let step = 0;
  while (step + 1 < ORDER_STEPS.length && ORDER_STEPS[step + 1] <= t) step++;
  const screen = step <= 4 ? "menu" : step <= 7 ? "checkout" : "send";
  const money = useMoney(demo);

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={screen}
        className="absolute inset-0"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-30%", opacity: 0.4 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      >
        {screen === "menu" && <MenuScreen demo={demo} step={step} money={money} />}
        {screen === "checkout" && <CheckoutScreen demo={demo} step={step} money={money} animate />}
        {screen === "send" && <SendScreen tapping />}
      </motion.div>
    </AnimatePresence>
  );
}

// ---------- 8. The order arrives, complete ----------

export function ArriveScene({ t, demo }: SceneProps) {
  const tDemo = useTranslations("home.demo");
  const money = useMoney(demo);
  const customer = demo.customer.name;
  const banner = t < 3 ? ramp(t, 0.3, 0.6) : 1 - ramp(t, 3, 3.3);
  const bubble = ramp(t, 0.9, 1.4);

  return (
    <div className="relative flex h-full flex-col bg-[#f7f7f7] pt-9">
      <TelegramHeader
        back={tDemo("tgChats")}
        title={customer}
        subtitle={tDemo("tgOnline")}
        subtitleOnline
        avatar={<TelegramAvatar name={customer} />}
      />
      <TelegramWallpaper className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden p-2.5">
        <TelegramDate label={tDemo("tgToday")} />
        <div
          className="origin-bottom-left"
          style={{ opacity: bubble, transform: `scale(${0.85 + bubble * 0.15})` }}
        >
          <TelegramBubble
            outgoing={false}
            time={CHAT_TIMES[0]}
            className="max-w-[94%] text-[9.5px] leading-[1.35]"
          >
            <TelegramText text={demo.message} />
          </TelegramBubble>
        </div>
      </TelegramWallpaper>
      <TelegramComposer placeholder={tDemo("tgPlaceholder")} />

      {banner > 0 && (
        <div
          className="absolute inset-x-2 top-9 z-20 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
          style={{ opacity: banner, transform: `translateY(${(1 - banner) * -40}px)` }}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: TELEGRAM_BLUE }}
          >
            <Send className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold">
              {tDemo("newOrder", { number: demo.orderNumber })}
            </p>
            <p className="text-[11px] text-black/55 tabular-nums">
              {tDemo("newOrderBody", { count: demo.picks.length, total: money(demo.total) })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** 80 mm kitchen ticket sliding out next to the phone (stage overlay of the "arrive" scene) */
export function KitchenTicket({ t, demo }: SceneProps) {
  const tx = useTranslations("home.explainer");
  const p = ramp(t, 4, 5.2);
  if (p === 0) return null;
  const items = demo.products.filter((x) => demo.picks.includes(x.id));
  return (
    <div
      className="absolute right-0 bottom-10 z-20 w-36 rotate-3 bg-white px-3 py-2.5 font-mono text-[10px] text-black shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] sm:-right-6 sm:w-40"
      style={{ opacity: p, transform: `translateY(${(1 - p) * 50}px) rotate(3deg)` }}
      aria-hidden
    >
      <p className="text-center font-bold tracking-widest uppercase">{tx("ticket")}</p>
      <p className="mt-1 text-center text-[18px] font-bold">№{demo.orderNumber}</p>
      <div className="my-1.5 border-t border-dashed border-black/40" />
      {items.map((x) => (
        <p key={x.id} className="truncate">
          1× {x.name}
        </p>
      ))}
      <div className="mt-1.5 border-t border-dashed border-black/40" />
    </div>
  );
}

// ---------- 9. The customer follows the order ----------

const STATUS_AT = [0, 1.4, 3, 4.6, 6.2];
const STATUSES = ["NEW", "ACCEPTED", "READY", "ON_THE_WAY", "COMPLETED"] as const;

export function StatusScene({ t, demo }: SceneProps) {
  const tx = useTranslations("home.explainer");
  const tDemo = useTranslations("home.demo");
  const tStatus = useTranslations("status");
  const money = useMoney(demo);
  let current = 0;
  while (current + 1 < STATUS_AT.length && STATUS_AT[current + 1] <= t) current++;

  return (
    <div className="flex h-full flex-col bg-neutral-50 px-4 pt-11 text-[#111]">
      <div className="flex items-center gap-2.5">
        <span className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
          {demo.store.logoUrl && (
            <Image src={demo.store.logoUrl} alt="" fill sizes="36px" className="object-cover" />
          )}
        </span>
        <div>
          <p className="text-[15px] font-bold">{tx("orderTitle", { number: demo.orderNumber })}</p>
          <p className="text-[11px] text-black/50">{demo.store.name}</p>
        </div>
      </div>

      <ol className="mt-5 flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        {STATUSES.map((s, i) => {
          const done = i < current || (i === current && i === STATUSES.length - 1);
          const now = i === current && !done;
          return (
            <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
              {i < STATUSES.length - 1 && (
                <span className="absolute top-6 bottom-0 left-[11px] w-0.5 bg-black/10">
                  <span
                    className="block w-full bg-emerald-500"
                    style={{
                      height: `${i < current ? 100 : 0}%`,
                      transition: "height 0.4s",
                    }}
                  />
                </span>
              )}
              <span
                className={cn(
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                  done && "bg-emerald-500 text-white",
                  now && "bg-primary ring-primary/25 text-white ring-4",
                  !done && !now && "bg-black/10",
                )}
              >
                {done && <Check className="size-3.5" strokeWidth={3} />}
                {now && <span className="size-2 rounded-full bg-white" />}
              </span>
              <p
                className={cn(
                  "pt-0.5 text-[13px]",
                  i <= current ? "font-semibold" : "text-black/40",
                )}
              >
                {tStatus(s)}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex justify-between rounded-2xl bg-white px-4 py-3 text-[12px] shadow-sm ring-1 ring-black/5">
        <span className="text-black/55">{tDemo("items", { count: demo.picks.length })}</span>
        <span className="font-semibold tabular-nums">{money(demo.total)}</span>
      </div>
    </div>
  );
}

// ---------- 10. End of the day: the numbers ----------

const HOURS = [2, 5, 9, 7, 3, 2, 4, 8, 10, 6, 3];
const TOP_SHARE = [1, 0.7, 0.5, 0.35];

export function ReportScene({ t, demo }: SceneProps) {
  const tx = useTranslations("home.explainer");
  const money = useMoney(demo);
  const grow = ramp(t, 0.3, 3);
  const orders = Math.round(34 * grow);
  const returning = Math.round(12 * grow);

  return (
    <div className="flex h-full flex-col gap-2.5 bg-neutral-50 px-3 pt-11 text-[#111]">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[16px] font-bold">{tx("today")}</p>
        <p className="text-[10px] text-black/40">{tx("sample")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile label={tx("orders")} value={String(orders)} />
        <Tile label={tx("returning")} value={String(returning)} />
        <Tile
          className="col-span-2"
          label={tx("revenue")}
          value={money(Math.round((orders * demo.total) / 100) * 100)}
        />
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <p className="text-[10px] font-semibold tracking-wide text-black/45 uppercase">
          {tx("byHour")}
        </p>
        <div className="mt-2 flex h-14 items-end gap-1">
          {HOURS.map((h, i) => (
            <span
              key={i}
              className="bg-primary/80 flex-1 rounded-t"
              style={{ height: `${h * 10 * ramp(t, 0.8 + i * 0.12, 1.6 + i * 0.12)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
        <p className="text-[10px] font-semibold tracking-wide text-black/45 uppercase">
          {tx("top")}
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {demo.products.map((p, i) => (
            <li key={p.id} className="text-[11px]">
              <p className="truncate font-medium">{p.name}</p>
              <span className="mt-0.5 block h-1.5 rounded-full bg-black/5">
                <span
                  className="block h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${TOP_SHARE[i % TOP_SHARE.length] * 100 * ramp(t, 3 + i * 0.3, 4 + i * 0.3)}%`,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Tile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5", className)}>
      <p className="text-[10px] font-semibold tracking-wide text-black/45 uppercase">{label}</p>
      <p className="mt-1 text-[20px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ---------- 11. End card: the store, live ----------

export function EndScene({ demo }: SceneProps) {
  const money = useMoney(demo);
  return <MenuScreen demo={demo} step={0} money={money} />;
}
