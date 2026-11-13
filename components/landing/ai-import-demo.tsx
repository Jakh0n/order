"use client";

import { Check, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A paper menu with a scan line sweeping over it; the dishes it "reads" appear one by one
 * on the right, as they do in the real import (Products → Import menu).
 */
export function AiImportDemo({
  dishes,
  paperTitle,
  foundLabel,
}: {
  dishes: { name: string; price: string }[];
  paperTitle: string;
  foundLabel: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="grid items-center gap-6 sm:grid-cols-2">
      {/* The paper menu */}
      <div
        aria-hidden
        className="relative mx-auto w-full max-w-[260px] -rotate-2 overflow-hidden rounded-2xl bg-[#fbf6ea] p-6 shadow-[0_20px_40px_-20px_rgba(18,55,42,.45)] ring-1 ring-[#e8dfc9]"
      >
        <p className="font-display text-forest text-center text-lg font-bold tracking-wide uppercase">
          {paperTitle}
        </p>
        <ul className="mt-4 flex flex-col gap-3 font-serif text-[15px] text-[#4a3f2c]">
          {dishes.map((d) => (
            <li key={d.name} className="flex items-baseline gap-2">
              <span>{d.name}</span>
              <span className="flex-1 border-b border-dotted border-[#c9bb98]" />
              <span className="tabular-nums">{d.price}</span>
            </li>
          ))}
        </ul>
        {!reduce && (
          <motion.div
            className="via-primary/25 to-primary/0 absolute inset-x-0 h-16 bg-gradient-to-b from-transparent"
            initial={{ top: "-20%" }}
            animate={{ top: ["-20%", "100%"] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
          >
            <div className="bg-primary absolute inset-x-0 bottom-0 h-0.5 shadow-[0_0_12px_2px] shadow-emerald-400" />
          </motion.div>
        )}
      </div>

      {/* What the AI found */}
      <div className="rounded-3xl bg-white p-4 shadow-[0_20px_50px_-30px_rgba(18,55,42,.5)] ring-1 ring-black/5 sm:p-5">
        <p className="text-primary flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4" aria-hidden />
          {foundLabel}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {dishes.map((d, i) => (
            <motion.li
              key={d.name}
              className="bg-muted/60 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm"
              initial={reduce ? false : { opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.5 + i * 0.35 }}
            >
              <span className="bg-primary flex size-5 shrink-0 items-center justify-center rounded-md text-white">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              <span className="flex-1 font-medium">{d.name}</span>
              <span className="text-forest/70 tabular-nums">{d.price}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
