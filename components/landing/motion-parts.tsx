"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

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

/** Types `text` in, starting after `delay` ms (instant when not animating) */
export function useTyped(text: string, animate: boolean, delay: number): string {
  const [count, setCount] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) timer = setTimeout(tick, 45);
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [text, animate, delay]);
  return text.slice(0, count);
}
