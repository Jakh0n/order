"use client";

import { MessageCircle, Phone, RotateCcw, Star, Tag, Truck, Users } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const STEP_MS = 3200;
const ICONS = [MessageCircle, Truck, Star, RotateCcw, Users] as const;

type Step = { title: string; body: string; pro?: boolean };

/**
 * "Your customers stay yours": the five moments of a customer relationship in Flami.
 * Steps advance on their own while the section is on screen (paused on hover / tap,
 * off with reduced motion); each step has its own small demo on the right.
 */
export function RelationshipLoop() {
  const t = useTranslations("home.loop");
  const steps = t.raw("steps") as Step[];
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused || !inView) return;
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearInterval(id);
  }, [reduce, paused, inView, steps.length]);

  return (
    <div
      ref={ref}
      className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const Icon = ICONS[i];
          const on = i === active;
          return (
            <li key={step.title}>
              <button
                type="button"
                onClick={() => {
                  setActive(i);
                  setPaused(true);
                }}
                aria-current={on ? "step" : undefined}
                className={cn(
                  "relative flex w-full items-start gap-4 overflow-hidden rounded-3xl p-4 text-left transition-colors sm:p-5",
                  on
                    ? "bg-white shadow-[0_20px_50px_-30px_rgba(18,55,42,.55)]"
                    : "hover:bg-white/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
                    on ? "bg-primary text-white" : "text-primary bg-white",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="text-forest/40 tabular-nums">{i + 1}</span>
                    {step.title}
                    {step.pro && (
                      <span className="bg-forest rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                        Pro
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-forest/65 mt-1 block leading-relaxed",
                      !on && "hidden sm:line-clamp-1",
                    )}
                  >
                    {step.body}
                  </span>
                </span>
                {/* Time to the next step */}
                {on && !reduce && !paused && inView && (
                  <motion.span
                    key={`bar-${active}`}
                    className="bg-primary absolute bottom-0 left-0 h-0.5"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="bg-chat relative flex min-h-80 items-center justify-center overflow-hidden rounded-[2.5rem] p-6 sm:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="w-full max-w-sm"
            initial={reduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <StepDemo index={active} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const card = "rounded-2xl bg-white p-4 shadow-[0_1px_0.5px_rgba(11,20,26,.13)]";

function StepDemo({ index }: { index: number }) {
  const t = useTranslations("home.loop.demo");
  const reduce = useReducedMotion();

  if (index === 0) {
    // The order lands in the owner's own chat with who ordered
    return (
      <div className="bg-bubble ml-auto w-[88%] rounded-2xl rounded-tr-sm p-4 text-sm text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
        <b>{t("orderTitle")}</b>
        <p className="mt-2">{t("orderItems")}</p>
        <motion.p
          className="mt-3 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2"
          initial={reduce ? false : { backgroundColor: "rgba(255,255,255,0.7)" }}
          animate={reduce ? undefined : { backgroundColor: ["#ffffffb3", "#fff3c4", "#ffffffb3"] }}
          transition={{ duration: 1.6, delay: 0.4 }}
        >
          <Phone className="text-primary size-4" aria-hidden />
          <span>
            <b>{t("customerName")}</b> · {t("customerPhone")}
          </span>
        </motion.p>
      </div>
    );
  }

  if (index === 1) {
    // Live status the customer sees
    const statuses = t.raw("statuses") as string[];
    return (
      <div className={card}>
        <p className="text-sm font-semibold">{t("trackTitle")}</p>
        <ol className="mt-3 flex flex-col gap-2.5">
          {statuses.map((s, i) => (
            <motion.li
              key={s}
              className="flex items-center gap-2.5 text-sm"
              initial={reduce ? false : { opacity: 0.35 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.5 }}
            >
              <motion.span
                className="flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                initial={reduce ? false : { backgroundColor: "#cfd8d3" }}
                animate={{ backgroundColor: "oklch(0.6 0.16 152)" }}
                transition={{ delay: 0.3 + i * 0.5 }}
              >
                ✓
              </motion.span>
              {s}
            </motion.li>
          ))}
        </ol>
      </div>
    );
  }

  if (index === 2) {
    // A review in one tap
    return (
      <div className={cn(card, "text-center")}>
        <p className="font-semibold">{t("reviewAsk")}</p>
        <div className="mt-3 flex justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              initial={reduce ? false : { scale: 0.6, opacity: 0.3 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 400, damping: 15 }}
            >
              <Star className="size-8 fill-amber-400 text-amber-400" aria-hidden />
            </motion.span>
          ))}
        </div>
        <motion.p
          className="text-forest/70 mt-3 text-sm italic"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          “{t("reviewText")}”
        </motion.p>
      </div>
    );
  }

  if (index === 3) {
    // Coming back: order again + a code for regulars
    return (
      <div className={cn(card, "flex flex-col gap-3")}>
        <p className="text-sm font-semibold">{t("againTitle")}</p>
        <motion.span
          className="bg-primary flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white"
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
        >
          <RotateCcw className="size-4" aria-hidden />
          {t("againButton")}
        </motion.span>
        <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-sm">
          <Tag className="size-4 text-amber-600" aria-hidden />
          <b className="tracking-wider">{t("promoCode")}</b> · {t("promoText")}
        </p>
      </div>
    );
  }

  // Your regulars, by phone number
  const rows = t.raw("regulars") as { name: string; orders: string }[];
  return (
    <div className={card}>
      <p className="text-sm font-semibold">{t("regularsTitle")}</p>
      <ul className="mt-3 flex flex-col divide-y">
        {rows.map((r, i) => (
          <motion.li
            key={r.name}
            className="flex items-center justify-between py-2 text-sm"
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.2 }}
          >
            <span className="flex items-center gap-2">
              <span className="bg-mint text-primary flex size-7 items-center justify-center rounded-full text-xs font-bold">
                {r.name.charAt(0)}
              </span>
              {r.name}
            </span>
            <span className="text-forest/60 tabular-nums">{r.orders}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
