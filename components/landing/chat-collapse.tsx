"use client";

import { Check, CircleAlert } from "lucide-react";
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

import { cn } from "@/lib/utils";

import { DmVsFlami } from "./dm-vs-flami";
import { OrderMessage } from "./order-message";

/** Where on the scroll track things happen (0 = track enters, 1 = track leaves) */
const MESSAGES_END = 0.5;
const COLLAPSE = [0.56, 0.7] as const;
const ORDER_IN = [0.64, 0.78] as const;

/**
 * Scroll story: the phone stays in place while DM messages pile up (counter in red),
 * then they squeeze together and turn into one complete Flami order (counter in green).
 * Reduced motion: the two chats side by side instead.
 */
export function ChatCollapse() {
  const t = useTranslations("home.problem");
  const messages = t.raw("messages") as string[];
  const dmLabel = t("dmLabel");
  const flamiLabel = t("flamiLabel");
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  useMotionValueEvent(p, "change", (v) => {
    setShown(Math.min(messages.length, Math.floor((v / MESSAGES_END) * messages.length) + 1));
    setDone(v >= COLLAPSE[0] + 0.04);
  });

  // The pile squeezes up and fades; the order grows in its place
  const pileScale = useTransform(p, [...COLLAPSE], [1, 0.35]);
  const pileOpacity = useTransform(p, [...COLLAPSE], [1, 0]);
  const pileY = useTransform(p, [...COLLAPSE], [0, -80]);
  const pileBlur = useTransform(p, [...COLLAPSE], ["blur(0px)", "blur(6px)"]);
  const orderScale = useTransform(p, [...ORDER_IN], [0.7, 1]);
  const orderOpacity = useTransform(p, [...ORDER_IN], [0, 1]);

  if (reduce) {
    return <DmVsFlami messages={messages} dmLabel={dmLabel} flamiLabel={flamiLabel} />;
  }

  return (
    <div ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-svh items-center justify-center py-16">
        <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:justify-center lg:gap-14">
          {/* Counter: how much talking this order took */}
          <motion.p
            key={done ? "done" : "dm"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "order-first flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold sm:text-base lg:order-none lg:max-w-60 lg:flex-col lg:items-start lg:rounded-3xl lg:px-6 lg:py-5",
              done ? "bg-primary text-white" : "bg-red-50 text-red-700",
            )}
            aria-live="polite"
          >
            {done ? (
              <Check className="size-5 shrink-0 lg:size-7" aria-hidden />
            ) : (
              <CircleAlert className="size-5 shrink-0 lg:size-7" aria-hidden />
            )}
            <span>{done ? t("flamiStatus") : t("dmStatus", { count: Math.max(shown, 1) })}</span>
          </motion.p>

          {/* The phone */}
          <div className="ring-forest relative h-[min(560px,70svh)] w-[min(300px,80vw)] overflow-hidden rounded-[2.75rem] ring-[10px]">
            <div className="bg-forest absolute inset-x-0 top-0 z-10 flex h-14 items-end gap-2 px-5 pb-2 text-white">
              <span className="bg-primary flex size-7 items-center justify-center rounded-full text-xs font-bold">
                F
              </span>
              <span className="text-sm font-semibold">{done ? flamiLabel : dmLabel}</span>
            </div>
            <div className="bg-chat relative h-full px-3 pt-16 pb-4">
              <motion.ul
                className="flex origin-top flex-col gap-1.5"
                style={{ scale: pileScale, opacity: pileOpacity, y: pileY, filter: pileBlur }}
              >
                {messages.map((text, i) => (
                  <Bubble
                    key={i}
                    text={text}
                    fromCustomer={i % 2 === 0}
                    progress={p}
                    at={(i / messages.length) * MESSAGES_END}
                  />
                ))}
              </motion.ul>
              <motion.div
                className="absolute inset-x-3 top-20"
                style={{ scale: orderScale, opacity: orderOpacity }}
              >
                <OrderMessage className="ml-auto w-full" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  text,
  fromCustomer,
  progress,
  at,
}: {
  text: string;
  fromCustomer: boolean;
  progress: MotionValue<number>;
  at: number;
}) {
  const opacity = useTransform(progress, [at, at + 0.03], [0, 1]);
  const y = useTransform(progress, [at, at + 0.03], [14, 0]);
  return (
    <motion.li
      style={{ opacity, y }}
      className={cn(
        "max-w-[82%] rounded-xl px-3 py-1.5 text-[13px] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]",
        fromCustomer ? "rounded-tl-sm bg-white" : "bg-bubble ml-auto rounded-tr-sm",
      )}
    >
      {text}
    </motion.li>
  );
}
