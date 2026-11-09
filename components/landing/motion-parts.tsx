"use client";

import { type MotionValue, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades content in once when it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "ul" | "li";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** Steps with a connecting line that fills as the section scrolls past. */
export function StepsTrack({
  steps,
}: {
  steps: { title: string; body: string; visual: React.ReactNode }[];
}) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });

  return (
    <ol ref={ref} className="relative grid gap-12 md:grid-cols-3 md:gap-8">
      {/* Track: vertical on phones, horizontal from md */}
      <div className="bg-forest/10 absolute top-5 bottom-5 left-5 w-0.5 md:top-5 md:right-[16.6%] md:bottom-auto md:left-[16.6%] md:h-0.5 md:w-auto">
        <motion.div
          className="bg-primary absolute inset-0 origin-top md:hidden"
          style={{ scaleY: scrollYProgress }}
        />
        <motion.div
          className="bg-primary absolute inset-0 hidden origin-left md:block"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
      {steps.map((step, i) => (
        <Step key={i} index={i} count={steps.length} progress={scrollYProgress} {...step} />
      ))}
    </ol>
  );
}

function Step({
  index,
  count,
  progress,
  title,
  body,
  visual,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  const at = count > 1 ? index / (count - 1) : 0;
  // The number lights up when the line reaches it
  const lit = useTransform(progress, [Math.max(0, at - 0.02), at + 0.02], [0, 1]);
  const bg = useTransform(lit, [0, 1], ["#ffffff", "oklch(0.6 0.16 152)"]);
  const fg = useTransform(lit, [0, 1], ["#12372a", "#ffffff"]);

  return (
    <li className="relative flex gap-5 md:flex-col md:items-center md:text-center">
      <motion.span
        style={{ backgroundColor: bg, color: fg }}
        className="font-display ring-forest/10 relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ring-2"
      >
        {index + 1}
      </motion.span>
      <div className="flex flex-col gap-4 md:items-center">
        <div>
          <h3 className="font-display text-forest text-xl font-semibold tracking-tight">{title}</h3>
          <p className="text-forest/65 mt-2 max-w-xs leading-relaxed">{body}</p>
        </div>
        {visual}
      </div>
    </li>
  );
}

/** A sentence whose words darken as it scrolls through the viewport. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");

  if (reduce)
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );

  return (
    <p ref={ref} className={cn("flex flex-wrap", className)}>
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {word}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span aria-hidden style={{ opacity }} className="mr-[0.25em]">
      {children}
    </motion.span>
  );
}
