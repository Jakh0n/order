"use client";

import { Camera, Check, Copy, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

import { useTyped } from "./motion-parts";

/**
 * "How it works" as the owner lives it, on their phone:
 * 0–1 sign up (name → link → Telegram, "Open store") · 2–4 menu from a photo (scan → dishes →
 * "Add to menu") · 5 the store is live with its link. The step list on the left follows along.
 */
const STEPS = [3800, 700, 1900, 1900, 700, 3800];
const FINAL_STEP = STEPS.length - 1;

type Dish = { name: string; price: string };

function activeStep(step: number): 0 | 1 | 2 {
  if (step <= 1) return 0;
  if (step <= 4) return 1;
  return 2;
}

export function StoreSetup({ host }: { host: string }) {
  const t = useTranslations("home.setup");
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce || !inView) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEPS[step]);
    return () => clearTimeout(id);
  }, [step, inView, reduce]);

  const shown = reduce ? FINAL_STEP : step;
  const active = activeStep(shown);
  const steps = t.raw("steps") as { title: string; body: string }[];
  const dishes = t.raw("dishes") as Dish[];
  const storeName = t("exampleName");
  const link = `${host}/${slugify(storeName)}`;

  return (
    <div ref={ref} className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
      <div>
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">{t("eyebrow")}</p>
        <h2 className="font-display mt-3 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
          {t("title")}
        </h2>
        <ol className="mt-10 flex flex-col gap-3">
          {steps.map((s, i) => (
            <li
              key={i}
              className={cn(
                "flex gap-4 rounded-3xl p-4 transition-colors duration-300 sm:p-5",
                i === active ? "bg-mint" : "bg-transparent",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300",
                  i < active || (i === active && shown === FINAL_STEP)
                    ? "bg-emerald-600 text-white"
                    : i === active
                      ? "bg-primary text-white"
                      : "bg-forest/10 text-forest/60",
                )}
              >
                {i < active || (i === active && shown === FINAL_STEP) ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <div>
                <p className="font-display text-lg font-bold tracking-tight">{s.title}</p>
                <p className="text-forest/70 mt-1 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-forest/50 mt-4 pl-4 text-sm">{t("note")}</p>
      </div>

      {/* The owner's phone */}
      <div className="mx-auto w-[272px] sm:w-[300px]" aria-hidden>
        <div className="relative aspect-[9/19] rounded-[2.75rem] bg-[#1c211f] p-[9px] shadow-[0_50px_90px_-40px_rgba(18,55,42,0.55)]">
          <div className="relative h-full overflow-hidden rounded-[2.2rem] bg-white">
            <div className="absolute top-2 left-1/2 z-30 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#1c211f]" />
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={active}
                className="absolute inset-0 pt-10"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-30%", opacity: 0.4 }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              >
                {active === 0 && (
                  <SignupScreen
                    storeName={storeName}
                    host={host}
                    pressing={shown === 1}
                    animate={!reduce}
                  />
                )}
                {active === 1 && <ImportScreen dishes={dishes} step={shown} />}
                {active === 2 && <LiveScreen storeName={storeName} dishes={dishes} link={link} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 1. Sign up ----------

function SignupScreen({
  storeName,
  host,
  pressing,
  animate,
}: {
  storeName: string;
  host: string;
  pressing: boolean;
  animate: boolean;
}) {
  const t = useTranslations("signup");
  const tSetup = useTranslations("home.setup");
  const name = useTyped(storeName, animate, 300);
  const username = useTyped(tSetup("exampleTelegram"), animate, 1700);
  const slug = slugify(name);
  const nameDone = name === storeName;

  return (
    <div className="flex h-full flex-col px-4 text-[#111]">
      <p className="text-[11px] text-black/45">{t("step", { current: 2, total: 2 })}</p>
      <p className="mt-0.5 text-[17px] font-bold">{t("title")}</p>

      <div className="mt-4 flex flex-col gap-3">
        <Field label={t("storeName")} value={name} focused={!nameDone} />
        <div>
          <p className="mb-1 text-[10.5px] font-medium text-black/55">{t("slug")}</p>
          <div className="flex items-center gap-1 rounded-xl bg-neutral-50 px-3 py-2 text-[11.5px] ring-1 ring-black/10">
            <span className="text-black/40">{host}/</span>
            <span className="min-w-0 flex-1 truncate font-medium">{slug}</span>
            {nameDone && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600"
              >
                <Check className="size-3.5" strokeWidth={3} />
                {t("slugAvailable")}
              </motion.span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10.5px] font-medium text-black/55">{t("channel")}</p>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/5 p-0.5 text-center text-[11px] font-semibold">
            <span className="rounded-lg bg-white py-1.5 shadow-sm">{t("telegram")}</span>
            <span className="py-1.5 text-black/45">{t("whatsapp")}</span>
          </div>
        </div>
        <Field label={t("telegramUsername")} value={username} focused={nameDone} />
      </div>

      <motion.div
        animate={{ scale: pressing ? 0.95 : 1 }}
        className="bg-primary mt-auto mb-6 flex h-11 items-center justify-center rounded-2xl text-[13px] font-semibold text-white shadow-lg shadow-red-900/20"
      >
        {t("submit")}
      </motion.div>
    </div>
  );
}

function Field({ label, value, focused }: { label: string; value: string; focused: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-medium text-black/55">{label}</p>
      <div
        className={cn(
          "flex h-9 items-center rounded-xl bg-white px-3 text-[12.5px] font-medium ring-1",
          focused ? "ring-primary ring-2" : "ring-black/10",
        )}
      >
        {value}
        {focused && (
          <motion.span
            className="bg-primary ml-px inline-block h-4 w-px"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

// ---------- 2. Menu from a photo ----------

function ImportScreen({ dishes, step }: { dishes: Dish[]; step: number }) {
  const t = useTranslations("home.setup");
  const scanning = step === 2;

  return (
    <div className="flex h-full flex-col px-4 text-[#111]">
      <p className="flex items-center gap-1.5 text-[15px] font-bold">
        <Sparkles className="text-primary size-4" />
        {t("importTitle")}
      </p>

      {/* The paper menu under the camera, then the dishes it found */}
      <AnimatePresence mode="wait" initial={false}>
        {scanning ? (
          <motion.div
            key="paper"
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative mt-4 flex-1 overflow-hidden rounded-2xl bg-[#1c211f] p-4"
          >
            <div className="relative -rotate-2 rounded-xl bg-[#f8f4e6] px-4 py-4 font-serif text-[12px] text-[#3b3226] shadow-lg">
              <p className="mb-2 text-center text-[13px] font-semibold tracking-widest uppercase">
                {t("paperTitle")}
              </p>
              {dishes.map((d) => (
                <p key={d.name} className="flex items-baseline gap-1 py-1">
                  <span>{d.name}</span>
                  <span className="flex-1 border-b border-dotted border-[#3b3226]/40" />
                  <span className="tabular-nums">{d.price}</span>
                </p>
              ))}
              <motion.span
                className="absolute inset-x-0 h-0.5 bg-[#F5333F] shadow-[0_0_14px_4px_rgba(245,51,63,0.35)]"
                initial={{ top: "8%" }}
                animate={{ top: ["8%", "92%", "8%"] }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
              />
            </div>
            <span className="absolute bottom-3 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-white">
              <Camera className="size-5 text-[#1c211f]" />
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="found"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-1 flex-col"
          >
            <p className="text-primary text-[12px] font-semibold">
              {t("found", { count: dishes.length })}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {dishes.map((d, i) => (
                <motion.li
                  key={d.name}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.18 }}
                  className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 text-[12.5px] ring-1 ring-black/5"
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="flex-1 font-medium">{d.name}</span>
                  <span className="text-black/55 tabular-nums">{d.price}</span>
                </motion.li>
              ))}
            </ul>
            <motion.div
              animate={{ scale: step === 4 ? 0.95 : 1 }}
              className="bg-primary mt-auto mb-6 flex h-11 items-center justify-center rounded-2xl text-[13px] font-semibold text-white shadow-lg shadow-red-900/20"
            >
              {t("addToMenu")}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- 3. Live ----------

function LiveScreen({
  storeName,
  dishes,
  link,
}: {
  storeName: string;
  dishes: Dish[];
  link: string;
}) {
  const t = useTranslations("home.setup");
  return (
    <div className="flex h-full flex-col text-[#111]">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mx-3 flex items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2.5 text-white"
      >
        <Check className="size-4 shrink-0" strokeWidth={3} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold">{t("ready")}</p>
          <p className="truncate font-mono text-[10.5px] opacity-90">{link}</p>
        </div>
        <Copy className="size-4 shrink-0 opacity-90" />
      </motion.div>

      <div className="from-primary/80 to-saffron/80 mt-3 h-16 shrink-0 bg-gradient-to-br" />
      <div className="px-4">
        <div className="bg-primary font-display relative -mt-6 flex size-12 items-center justify-center rounded-2xl text-xl font-bold text-white ring-4 ring-white">
          {storeName.charAt(0)}
        </div>
        <p className="font-display mt-1.5 text-[15px] font-bold">{storeName}</p>
        <p className="flex items-center gap-1.5 text-[11px] text-black/55">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t("open")}
        </p>
      </div>
      <ul className="mt-3 flex flex-col gap-2 px-4">
        {dishes.map((d, i) => (
          <motion.li
            key={d.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="bg-mint flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-[#12372a]/60">
              {d.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">{d.name}</span>
              <span className="block text-[11px] text-black/55 tabular-nums">{d.price}</span>
            </span>
            <span className="flex size-7 items-center justify-center rounded-full text-black/50 ring-1 ring-black/15">
              +
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
