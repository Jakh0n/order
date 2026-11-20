"use client";

import { ArrowLeft, Check, CircleAlert, X } from "lucide-react";
import {
  type MotionValue,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import type { LandingDemo } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

import { CHAT_TIMES, minutesBetween, ORDER_FACTS } from "./chat-story";
import { DmVsFlami } from "./dm-vs-flami";
import { TELEGRAM_WALLPAPER, TelegramBubble, TelegramText } from "./telegram";

/** Where on the scroll track things happen (0 = track enters, 1 = track leaves) */
const MESSAGES_END = 0.5;
const COLLAPSE = [0.56, 0.7] as const;
const ORDER_IN = [0.64, 0.78] as const;
/** Shown before any scrolling, so the phone never starts empty */
const VISIBLE_AT_START = 2;

/**
 * Scroll story on the owner's phone (Telegram): the order is pieced together over many messages
 * and minutes, a checklist shows what's still missing; then it all collapses into the one complete
 * message a Tezda order sends. Reduced motion: the two chats side by side instead.
 */
export function ChatCollapse({ demo }: { demo: LandingDemo | null }) {
  const t = useTranslations("home.problem");
  const messages = t.raw("messages") as string[];
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const [shown, setShown] = useState(VISIBLE_AT_START);
  const [done, setDone] = useState(false);
  useMotionValueEvent(p, "change", (v) => {
    const extra = Math.floor((v / MESSAGES_END) * (messages.length - VISIBLE_AT_START + 1));
    setShown(Math.min(messages.length, VISIBLE_AT_START + Math.max(0, extra)));
    setDone(demo !== null && v >= COLLAPSE[0] + 0.04);
  });

  // The pile squeezes up and fades; the order grows in its place
  const pileScale = useTransform(p, [...COLLAPSE], [1, 0.35]);
  const pileOpacity = useTransform(p, [...COLLAPSE], [1, 0]);
  const pileY = useTransform(p, [...COLLAPSE], [0, -80]);
  const pileBlur = useTransform(p, [...COLLAPSE], ["blur(0px)", "blur(6px)"]);
  const orderScale = useTransform(p, [...ORDER_IN], [0.7, 1]);
  const orderOpacity = useTransform(p, [...ORDER_IN], [0, 1]);

  if (reduce) return <DmVsFlami messages={messages} demo={demo} />;

  const minutes = minutesBetween(CHAT_TIMES[0], CHAT_TIMES[shown - 1] ?? CHAT_TIMES[0]);
  const customer = demo?.customer.name ?? "";

  return (
    <div ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-svh items-center justify-center py-16">
        <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-center lg:gap-14">
          {/* What this order cost so far + what's still missing */}
          <div
            className={cn(
              "order-first flex w-[min(300px,80vw)] flex-col gap-3 rounded-3xl px-5 py-4 transition-colors duration-300 lg:order-none lg:w-64 lg:py-6",
              done ? "bg-primary text-white" : "bg-red-50 text-red-700",
            )}
            aria-live="polite"
          >
            <motion.p
              key={done ? "done" : "dm"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 text-sm font-semibold sm:text-base"
            >
              {done ? (
                <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
              ) : (
                <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              )}
              <span>{done ? t("tezdaStatus") : t("dmStatus", { count: shown, minutes })}</span>
            </motion.p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm font-medium">
              {ORDER_FACTS.map((fact) => {
                const known = done || (fact.doneAt !== null && shown > fact.doneAt);
                return (
                  <li key={fact.key} className="flex items-center gap-1.5">
                    <motion.span
                      key={String(known)}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full",
                        known
                          ? done
                            ? "text-primary bg-white"
                            : "bg-emerald-600 text-white"
                          : "bg-red-200 text-red-700",
                      )}
                    >
                      {known ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : (
                        <X className="size-3" strokeWidth={3} />
                      )}
                    </motion.span>
                    {t(`facts.${fact.key}`)}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The owner's phone: a Telegram chat with the customer */}
          <div className="relative h-[min(560px,70svh)] w-[min(300px,80vw)] overflow-hidden rounded-[2.75rem] bg-[#1c211f] p-[9px] shadow-[0_40px_80px_-40px_rgba(18,55,42,0.5)]">
            <div
              className={cn("relative h-full overflow-hidden rounded-[2.2rem]", TELEGRAM_WALLPAPER)}
            >
              <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2.5 bg-white px-4 pt-7 pb-2 text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                <ArrowLeft className="size-4 shrink-0 text-[#229ED9]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{customer || t("customer")}</p>
                  <p className="truncate text-[10.5px] text-black/45">
                    {done ? t("tezdaLabel") : t("dmLabel")}
                  </p>
                </div>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb36b] to-[#f2754e] text-xs font-bold text-white">
                  {(customer || t("customer")).charAt(0)}
                </span>
              </div>

              <div className="relative h-full px-2.5 pt-[4.5rem] pb-4">
                <motion.ul
                  className="flex origin-top flex-col gap-1.5"
                  style={{ scale: pileScale, opacity: pileOpacity, y: pileY, filter: pileBlur }}
                >
                  {messages.map((text, i) => (
                    <Bubble
                      key={i}
                      text={text}
                      time={CHAT_TIMES[i] ?? ""}
                      fromCustomer={i % 2 === 0}
                      progress={p}
                      at={
                        i < VISIBLE_AT_START
                          ? -1
                          : ((i - VISIBLE_AT_START + 1) /
                              (messages.length - VISIBLE_AT_START + 1)) *
                            MESSAGES_END
                      }
                    />
                  ))}
                </motion.ul>
                {demo && (
                  <motion.div
                    className="absolute inset-x-2.5 top-[4.5rem]"
                    style={{ scale: orderScale, opacity: orderOpacity }}
                  >
                    <TelegramBubble
                      outgoing={false}
                      time={CHAT_TIMES[0]}
                      className="text-[10px] leading-[1.35]"
                    >
                      <TelegramText text={demo.message} />
                    </TelegramBubble>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  text,
  time,
  fromCustomer,
  progress,
  at,
}: {
  text: string;
  time: string;
  fromCustomer: boolean;
  progress: MotionValue<number>;
  at: number;
}) {
  const opacity = useTransform(progress, [at, at + 0.03], [0, 1]);
  const y = useTransform(progress, [at, at + 0.03], [14, 0]);
  return (
    <motion.li style={at < 0 ? undefined : { opacity, y }}>
      <TelegramBubble outgoing={!fromCustomer} time={time} className="text-[13px]">
        {text}
      </TelegramBubble>
    </motion.li>
  );
}
