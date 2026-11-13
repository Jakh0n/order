"use client";

import { CheckCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import { OrderMessage } from "./order-message";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Left: an order pieced together over many DMs (messages pop in one by one).
 * Right: the same order from Flami, complete in one message. Plays once on scroll.
 */
export function DmVsFlami({
  messages,
  dmLabel,
  flamiLabel,
}: {
  /** Alternating customer / owner lines, customer first */
  messages: string[];
  dmLabel: string;
  flamiLabel: string;
}) {
  const reduce = useReducedMotion();
  const step = 0.28;

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-8">
      <div className="flex flex-col rounded-[2rem] bg-[#f3efe7] p-4 sm:p-6">
        <p className="text-forest/60 mb-4 text-sm font-semibold tracking-wide uppercase">
          {dmLabel}
        </p>
        <ul className="flex flex-col gap-2">
          {messages.map((text, i) => {
            const fromCustomer = i % 2 === 0;
            return (
              <motion.li
                key={i}
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-[0_1px_0.5px_rgba(11,20,26,.13)]",
                  fromCustomer
                    ? "rounded-tl-sm bg-white text-[#111b21]"
                    : "bg-bubble ml-auto rounded-tr-sm text-[#111b21]",
                )}
                initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                transition={{ duration: 0.35, ease: EASE, delay: i * step }}
              >
                {text}
              </motion.li>
            );
          })}
          {/* Still typing… the order isn't finished */}
          <motion.li
            aria-hidden
            className="flex w-fit gap-1 rounded-2xl rounded-tl-sm bg-white px-3.5 py-3"
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -15% 0px" }}
            transition={{ delay: messages.length * step }}
          >
            {[0, 1, 2].map((d) => (
              <motion.span
                key={d}
                className="size-1.5 rounded-full bg-[#8696a0]"
                animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
              />
            ))}
          </motion.li>
        </ul>
      </div>

      <motion.div
        className="bg-mint flex flex-col rounded-[2rem] p-4 sm:p-6"
        initial={reduce ? false : { opacity: 0, x: 24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "0px 0px -15% 0px" }}
        transition={{ duration: 0.7, ease: EASE, delay: reduce ? 0 : 0.4 }}
      >
        <p className="text-primary mb-4 flex items-center gap-1.5 text-sm font-semibold tracking-wide uppercase">
          <CheckCheck className="size-4" aria-hidden />
          {flamiLabel}
        </p>
        <div className="bg-chat flex flex-1 items-start rounded-3xl p-4 sm:p-6">
          <OrderMessage className="ml-auto w-full max-w-[300px]" />
        </div>
      </motion.div>
    </div>
  );
}
