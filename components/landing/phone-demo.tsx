"use client";

import { ArrowLeft, Bell, Phone as PhoneIcon, Plus, ShoppingBag, Video } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { DEMO_ORDER, OrderMessage, demoTotal, usd } from "./order-message";

const PRODUCTS = [
  {
    id: "doner",
    name: "Doner Combo",
    note: "Doner wrap, fries and a drink",
    price: 12.99,
    img: "/landing/doner.jpg",
  },
  {
    id: "shish",
    name: "Chicken Shish Plate",
    note: "Rice, salad, garlic sauce",
    price: 14.99,
    img: "/landing/shish.jpg",
  },
  {
    id: "fries",
    name: "Fries",
    note: "Sea salt and paprika",
    price: 3.99,
    img: "/landing/fries.jpg",
  },
  { id: "ayran", name: "Ayran", note: "Cold yogurt drink", price: 2.49, img: "/landing/ayran.jpg" },
];

/** Products the "customer" taps, in order — matches DEMO_ORDER. */
const PICKS = ["doner", "fries", "ayran"];

/**
 * Timeline, ms per step:
 * 0 menu · 1–3 add items · 4 press "Send order" · 5 chat, message types in · 6 read + notification
 */
const STEPS = [1500, 950, 950, 1200, 650, 3400, 3200];
const FINAL_STEP = STEPS.length - 1;

export function PhoneDemo() {
  const t = useTranslations("home.demo");
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const [step, setStep] = useState(0);

  // Plays only while visible; reduced motion shows the finished order instead.
  useEffect(() => {
    if (reduce || !inView) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEPS[step]);
    return () => clearTimeout(id);
  }, [step, inView, reduce]);

  const shown = reduce ? FINAL_STEP : step;
  const added = PICKS.slice(0, Math.min(shown, PICKS.length));
  const tapping = shown >= 1 && shown <= PICKS.length ? PICKS[shown - 1] : null;
  const screen = shown >= 5 ? "chat" : "menu";
  const cartTotal = PRODUCTS.filter((p) => added.includes(p.id)).reduce((s, p) => s + p.price, 0);

  return (
    <div ref={ref} className="relative" role="img" aria-label={t("label")}>
      {/* Phone */}
      <div className="relative mx-auto aspect-[9/19] w-[272px] rounded-[2.75rem] bg-[#1c211f] p-[9px] shadow-[0_50px_90px_-40px_rgba(18,55,42,0.55),0_0_0_1px_rgba(255,255,255,0.06)_inset] sm:w-[300px]">
        <div className="relative h-full overflow-hidden rounded-[2.2rem] bg-white" aria-hidden>
          <div className="absolute top-2 left-1/2 z-30 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#1c211f]" />
          <StatusBar dark={screen === "chat"} />

          <AnimatePresence initial={false} mode="popLayout">
            {screen === "menu" ? (
              <motion.div
                key="menu"
                className="absolute inset-0"
                exit={{ x: "-30%", opacity: 0.4 }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              >
                <MenuScreen added={added} tapping={tapping} />
                <AnimatePresence>
                  {added.length > 0 && (
                    <motion.div
                      className="absolute inset-x-3 bottom-4 z-20"
                      initial={{ y: 80 }}
                      animate={{ y: 0, scale: shown === 4 ? 0.95 : 1 }}
                      exit={{ y: 80 }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    >
                      <div className="bg-primary flex h-12 items-center gap-2.5 rounded-2xl px-3.5 text-white shadow-lg shadow-emerald-900/25">
                        <span className="relative">
                          <ShoppingBag className="size-5" />
                          <motion.span
                            key={added.length}
                            initial={{ scale: 0.4 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 600, damping: 18 }}
                            className="text-primary absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-bold"
                          >
                            {added.length}
                          </motion.span>
                        </span>
                        <span className="flex-1 text-sm font-semibold">{t("viewCart")}</span>
                        <span className="text-sm font-semibold tabular-nums">{usd(cartTotal)}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                className="absolute inset-0"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              >
                <ChatScreen
                  read={shown === FINAL_STEP}
                  animate={!reduce}
                  status={t("chatStatus")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* The shop owner's side: the order shows up on their board */}
      <AnimatePresence>
        {shown === FINAL_STEP && (
          <motion.div
            className="absolute top-20 -right-4 z-10 w-56 rounded-2xl bg-white p-3 shadow-[0_20px_50px_-20px_rgba(18,55,42,0.45)] ring-1 ring-black/5 sm:-right-16 lg:-right-24"
            initial={reduce ? false : { opacity: 0, x: 24, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.5 }}
            aria-hidden
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-xl text-white">
                <Bell className="size-4" />
              </span>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold">
                  {t("newOrder", { number: DEMO_ORDER.number })}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {t("newOrderBody", { count: DEMO_ORDER.items.length, total: usd(demoTotal) })}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuScreen({ added, tapping }: { added: string[]; tapping: string | null }) {
  const t = useTranslations("home.demo");
  return (
    <div className="flex h-full flex-col bg-white pt-9">
      <div className="relative h-20 shrink-0 overflow-hidden">
        <Image src="/landing/sactava.jpg" alt="" fill sizes="300px" className="object-cover" />
      </div>
      <div className="px-4">
        <div className="font-display relative z-10 -mt-6 flex size-12 items-center justify-center rounded-2xl bg-[#e85d2a] text-xl font-bold text-white ring-4 ring-white">
          F
        </div>
        <p className="mt-1.5 text-[15px] font-bold">Flami Grill</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-black/55">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t("open")}
          <span className="text-black/25">|</span>
          {t("eta")}
        </p>
      </div>
      <div className="mt-3 flex gap-1.5 px-4 text-[11px] font-semibold">
        <span className="rounded-full bg-[#1c211f] px-2.5 py-1 text-white">{t("kebabs")}</span>
        <span className="rounded-full bg-black/5 px-2.5 py-1">{t("sides")}</span>
        <span className="rounded-full bg-black/5 px-2.5 py-1">{t("drinks")}</span>
      </div>
      <ul className="mt-2 flex flex-col px-3">
        {PRODUCTS.map((p) => {
          const inCart = added.includes(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                <Image src={p.img} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{p.name}</p>
                <p className="truncate text-[11px] text-black/50">{p.note}</p>
                <p className="mt-0.5 text-[12px] font-semibold tabular-nums">{usd(p.price)}</p>
              </div>
              <span className="relative flex size-8 shrink-0 items-center justify-center">
                {tapping === p.id && (
                  <motion.span
                    className="bg-primary/40 absolute inset-0 rounded-full"
                    initial={{ scale: 0.6, opacity: 0.9 }}
                    animate={{ scale: 2.1, opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                )}
                <motion.span
                  animate={{ scale: tapping === p.id ? [1, 0.82, 1] : 1 }}
                  transition={{ duration: 0.35 }}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                    inCart ? "bg-primary text-white" : "bg-white text-black ring-1 ring-black/15",
                  )}
                >
                  {inCart ? "1" : <Plus className="size-4" strokeWidth={2.5} />}
                </motion.span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBar({ dark }: { dark: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex h-9 items-center justify-between px-6 text-[11px] font-semibold transition-colors duration-300",
        dark ? "text-[#111b21]" : "text-white",
      )}
    >
      <span>7:42</span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-4 rounded-[3px] border border-current p-px">
          <span className="block h-full w-3/4 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}

function ChatScreen({
  read,
  animate,
  status,
}: {
  read: boolean;
  animate: boolean;
  status: string;
}) {
  return (
    <div className="bg-chat flex h-full flex-col">
      <div className="flex items-center gap-2.5 bg-white px-3 pt-10 pb-2.5 text-[#111b21] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <ArrowLeft className="size-4 shrink-0" />
        <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e85d2a] text-sm font-bold text-white">
          F
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">Flami Grill</p>
          <p className="truncate text-[10.5px] text-black/50">{status}</p>
        </div>
        <Video className="size-4 shrink-0" />
        <PhoneIcon className="size-3.5 shrink-0" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 p-3 pb-5">
        <span className="mx-auto rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-black/50">
          Today
        </span>
        <div className="ml-auto w-[88%]">
          <OrderMessage animate={animate} read={read} />
        </div>
      </div>
    </div>
  );
}
