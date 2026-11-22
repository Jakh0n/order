"use client";

import { Check, CircleAlert, X } from "lucide-react";
import {
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
import {
  PhoneStatusBar,
  TelegramAvatar,
  TelegramBubble,
  TelegramComposer,
  TelegramDate,
  TelegramHeader,
  TelegramText,
  TelegramWallpaper,
} from "./telegram";

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
  const tTg = useTranslations("home.demo");
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
  const pileY = useTransform(p, [...COLLAPSE], [0, -40]);
  const pileBlur = useTransform(p, [...COLLAPSE], ["blur(0px)", "blur(6px)"]);
  const orderScale = useTransform(p, [...ORDER_IN], [0.7, 1]);
  const orderOpacity = useTransform(p, [...ORDER_IN], [0, 1]);

  if (reduce) return <DmVsFlami messages={messages} demo={demo} />;

  const minutes = minutesBetween(CHAT_TIMES[0], CHAT_TIMES[shown - 1] ?? CHAT_TIMES[0]);
  const customer = demo?.customer.name ?? "";

  return (
    // data-hide-sticky-cta: the bottom signup bar would cover the phone while the story is pinned
    <div ref={ref} className="relative h-[260vh]" data-hide-sticky-cta>
      {/* pt clears the fixed header (h-16) so the checklist is never under it */}
      <div className="sticky top-0 flex h-svh items-center justify-center pt-20 pb-6 lg:py-16">
        <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-center lg:gap-14">
          {/* What this order cost so far + what's still missing */}
          <div
            className={cn(
              "order-first flex w-[min(300px,80vw)] flex-col gap-3 rounded-3xl px-5 py-4 transition-colors duration-300 lg:order-none lg:w-64 lg:py-6",
              done ? "bg-emerald-600 text-white" : "bg-red-50 text-red-700",
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
                            ? "bg-white text-emerald-700"
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

          {/* The owner's phone: Telegram, a chat with the customer */}
          <div className="relative h-[min(580px,calc(100svh-17rem))] w-[min(300px,80vw)] lg:h-[min(580px,calc(100svh-8rem))] rounded-[2.75rem] bg-[#1c211f] p-[9px] shadow-[0_40px_80px_-40px_rgba(18,55,42,0.5)]">
            <div className="flex h-full flex-col overflow-hidden rounded-[2.2rem] bg-[#f7f7f7]">
              <PhoneStatusBar
                time={done ? CHAT_TIMES[0] : (CHAT_TIMES[shown - 1] ?? CHAT_TIMES[0])}
              />
              <TelegramHeader
                back={tTg("tgChats")}
                unread={3}
                title={customer || t("customer")}
                subtitle={tTg("tgOnline")}
                subtitleOnline
                avatar={<TelegramAvatar name={customer || t("customer")} />}
              />
              <TelegramWallpaper className="min-h-0 flex-1 overflow-hidden">
                {/* Like Telegram: messages sit at the bottom by the composer; older ones go off the top */}
                <div className="relative flex h-full flex-col justify-end px-2.5 pt-2 pb-2">
                  <TelegramDate label={tTg("tgToday")} />
                  <motion.ul
                    className="flex origin-bottom flex-col gap-1"
                    style={{ scale: pileScale, opacity: pileOpacity, y: pileY, filter: pileBlur }}
                  >
                    {/* Only messages sent so far: unsent ones would take space at the bottom */}
                    {messages.slice(0, shown).map((text, i) => (
                      <Bubble
                        key={i}
                        text={text}
                        time={CHAT_TIMES[i] ?? ""}
                        fromCustomer={i % 2 === 0}
                        animate={i >= VISIBLE_AT_START}
                      />
                    ))}
                  </motion.ul>
                  {demo && (
                    <motion.div
                      className="absolute inset-x-2.5 bottom-2 origin-bottom"
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
              </TelegramWallpaper>
              <TelegramComposer placeholder={tTg("tgPlaceholder")} />
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
  animate,
}: {
  text: string;
  time: string;
  fromCustomer: boolean;
  /** Slides in when it arrives (the first messages are there from the start) */
  animate: boolean;
}) {
  return (
    <motion.li
      layout="position"
      initial={animate ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <TelegramBubble outgoing={!fromCustomer} time={time} className="text-[13px]">
        {text}
      </TelegramBubble>
    </motion.li>
  );
}
