"use client";

import { Bell, ChefHat, MapPin, Printer, QrCode, Truck } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Re-runs a small animation every `ms` while the tile is on screen (not with reduced motion) */
function useLoop(ms: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [inView, reduce, ms]);
  return { ref, tick, reduce };
}

function Tile({
  title,
  body,
  pro,
  className,
  children,
  tileRef,
}: {
  title: string;
  body: string;
  pro?: boolean;
  className?: string;
  children: React.ReactNode;
  tileRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={tileRef}
      className={cn(
        "bg-mint/60 flex flex-col overflow-hidden rounded-[2rem] p-6 sm:p-8",
        className,
      )}
    >
      <div className="relative flex min-h-56 flex-1 items-center justify-center">{children}</div>
      <h3 className="font-display mt-6 flex items-center gap-2 text-xl font-semibold tracking-tight">
        {title}
        {pro && (
          <span className="bg-forest rounded-full px-2 py-0.5 font-sans text-[10px] font-bold tracking-wide text-white uppercase">
            Pro
          </span>
        )}
      </h3>
      <p className="text-forest/65 mt-1.5 leading-relaxed">{body}</p>
    </div>
  );
}

export function InAction() {
  return (
    <div className="grid gap-5 md:grid-cols-6">
      <NotifyTile />
      <TableTile />
      <BrandTile />
      <DeliveryTile />
    </div>
  );
}

/** New order on the owner's lock screen + the customer's live status */
function NotifyTile() {
  const t = useTranslations("home.action.notify");
  const { ref, tick, reduce } = useLoop(4200);
  const statuses = t.raw("statuses") as string[];
  return (
    <Tile tileRef={ref} title={t("title")} body={t("body")} className="md:col-span-3">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="bg-forest relative h-28 overflow-hidden rounded-3xl px-4 pt-3 text-white">
          <p className="text-center text-xs text-white/60 tabular-nums">19:42</p>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={tick}
              className="mt-2 flex items-center gap-3 rounded-2xl bg-white/95 p-3 text-[#111b21]"
              initial={reduce ? false : { y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-white">
                <Bell className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 text-sm">
                <b className="block">{t("pushTitle", { number: 12 + (tick % 9) })}</b>
                <span className="text-[#54656f]">{t("pushBody")}</span>
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
        <ol className="flex items-center gap-1.5">
          {statuses.map((s, i) => (
            <motion.li
              key={`${s}-${tick}`}
              className="flex-1 rounded-full py-1.5 text-center text-[11px] font-semibold"
              initial={reduce ? false : { backgroundColor: "#ffffff", color: "#12372a99" }}
              animate={{ backgroundColor: "oklch(0.6 0.16 152)", color: "#ffffff" }}
              transition={{ delay: 0.8 + i * 0.6, duration: 0.3 }}
            >
              {s}
            </motion.li>
          ))}
        </ol>
      </div>
    </Tile>
  );
}

/** Table QR → kitchen ticket out of the printer */
function TableTile() {
  const t = useTranslations("home.action.table");
  const { ref, tick, reduce } = useLoop(4000);
  const lines = t.raw("ticket") as string[];
  return (
    <Tile tileRef={ref} title={t("title")} body={t("body")} className="md:col-span-3">
      <div className="flex items-center gap-5">
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <QrCode className="text-forest size-14" aria-hidden />
          <span className="text-xs font-bold">{t("tableLabel")}</span>
        </div>
        <motion.span
          className="text-primary text-2xl"
          animate={reduce ? undefined : { x: [0, 6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          aria-hidden
        >
          →
        </motion.span>
        <div className="flex flex-col items-center">
          <div className="bg-forest flex h-10 w-36 items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-white">
            <Printer className="size-4" aria-hidden />
            80 mm
          </div>
          <div className="h-36 w-28 overflow-hidden">
            <motion.div
              key={tick}
              className="mx-auto w-28 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-black shadow-md"
              initial={reduce ? false : { y: "-100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
            >
              <p className="flex items-center gap-1 font-bold">
                <ChefHat className="size-3" aria-hidden />
                {t("tableLabel").toUpperCase()}
              </p>
              {lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </Tile>
  );
}

const BRAND_COLORS = ["#16a05d", "#e4572e", "#7c3aed", "#0ea5e9", "#d97706"] as const;
const LANGS = ["uz", "ru", "en"] as const;

/** Interactive: pick a colour and a language, the sample store follows */
function BrandTile() {
  const t = useTranslations("home.action.brand");
  const [color, setColor] = useState<string>(BRAND_COLORS[1]);
  const [lang, setLang] = useState<(typeof LANGS)[number]>("uz");
  const dishes = t.raw(`dishes.${lang}`) as { name: string; price: string }[];
  return (
    <Tile title={t("title")} body={t("body")} className="md:col-span-4">
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
        <div className="w-full max-w-[240px] overflow-hidden rounded-3xl bg-white shadow-[0_20px_40px_-25px_rgba(18,55,42,.6)]">
          <motion.div
            className="flex h-14 items-end px-4 pb-2 text-sm font-bold text-white"
            animate={{ backgroundColor: color }}
            transition={{ duration: 0.35 }}
          >
            {t("storeName")}
          </motion.div>
          <ul className="flex flex-col gap-2 p-3">
            {dishes.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="block font-medium">{d.name}</span>
                  <span className="text-forest/60 text-xs tabular-nums">{d.price}</span>
                </span>
                <motion.span
                  className="flex size-7 items-center justify-center rounded-full text-white"
                  animate={{ backgroundColor: color }}
                  transition={{ duration: 0.35 }}
                  aria-hidden
                >
                  +
                </motion.span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-forest/60 mb-2 text-xs font-semibold uppercase">{t("colorLabel")}</p>
            <div className="flex gap-2">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-pressed={color === c}
                  className={cn(
                    "size-9 rounded-full transition-transform hover:scale-110",
                    color === c && "ring-forest ring-2 ring-offset-2",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-forest/60 mb-2 text-xs font-semibold uppercase">{t("langLabel")}</p>
            <div className="flex gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn(
                    "h-9 rounded-full px-3.5 text-sm font-semibold uppercase transition-colors",
                    lang === l ? "bg-forest text-white" : "text-forest bg-white hover:bg-white/70",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Tile>
  );
}

/** Distance rings around the store + "add X more for free delivery" bar */
function DeliveryTile() {
  const t = useTranslations("home.action.delivery");
  const { ref, tick, reduce } = useLoop(3600);
  const rings = t.raw("rings") as string[];
  return (
    <Tile tileRef={ref} title={t("title")} body={t("body")} pro className="md:col-span-2">
      <div className="flex w-full flex-col items-center gap-5">
        <div className="relative flex size-44 items-center justify-center">
          {[1, 0.7, 0.42].map((s, i) => (
            <motion.span
              key={s}
              className="border-primary/40 bg-primary/5 absolute rounded-full border-2 border-dashed"
              style={{ width: `${s * 100}%`, height: `${s * 100}%` }}
              animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
          <span className="bg-primary relative z-10 flex size-9 items-center justify-center rounded-full text-white shadow">
            <MapPin className="size-4" aria-hidden />
          </span>
          <span className="text-forest absolute top-1 right-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold shadow-sm">
            {rings[1]}
          </span>
          <span className="text-forest absolute bottom-6 -left-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold shadow-sm">
            {rings[0]}
          </span>
        </div>
        <div className="w-full rounded-2xl bg-white p-3 text-sm shadow-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <Truck className="text-primary size-4" aria-hidden />
            {t("freeBar")}
          </p>
          <div className="bg-mint mt-2 h-2 overflow-hidden rounded-full">
            <motion.div
              key={tick}
              className="bg-primary h-full rounded-full"
              initial={reduce ? false : { width: "20%" }}
              animate={{ width: "78%" }}
              transition={{ duration: 1.6, ease: EASE }}
            />
          </div>
        </div>
      </div>
    </Tile>
  );
}
