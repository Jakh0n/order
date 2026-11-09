"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PhoneDemo } from "./phone-demo";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const t = useTranslations("home.hero");
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // The phone drifts up a little slower than the page — a quiet depth cue
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);

  const title = t("title");
  const words = title.split(" ");

  return (
    <section ref={ref} className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="max-w-xl">
          <h1
            aria-label={title}
            className="font-display text-forest text-[2.6rem] leading-[1.02] font-bold tracking-[-0.035em] sm:text-6xl lg:text-[4.25rem]"
          >
            {words.map((word, i) => (
              <span
                key={i}
                aria-hidden
                className="inline-block overflow-hidden pb-[0.08em] align-bottom"
              >
                <motion.span
                  className="inline-block"
                  initial={reduce ? false : { y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.05 + i * 0.045 }}
                >
                  {word}
                  {i < words.length - 1 && " "}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
          >
            <p className="text-forest/70 mt-6 max-w-md text-lg leading-relaxed">{t("lead")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.span
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex"
              >
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-13 w-full rounded-full px-7 text-base shadow-[0_12px_30px_-12px] shadow-emerald-700/60 sm:w-auto",
                  )}
                >
                  {t("cta")}
                </Link>
              </motion.span>
              <Link
                href="/flami-grill"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "text-forest h-13 rounded-full px-5 text-base",
                )}
              >
                {t("demo")}
              </Link>
            </div>
            <p className="text-forest/55 mt-5 text-sm">{t("note")}</p>
          </motion.div>
        </div>

        <motion.div
          className="relative isolate py-6"
          initial={reduce ? false : { opacity: 0, y: 40, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.25 }}
        >
          {/* Mint block behind the phone */}
          <div className="bg-mint absolute inset-x-6 top-0 bottom-0 -z-10 rounded-[3rem] sm:inset-x-16 lg:inset-x-10" />
          <div className="bg-saffron absolute top-10 left-2 -z-10 size-16 rounded-full sm:left-14 lg:left-4" />
          <motion.div style={{ y: phoneY }}>
            <PhoneDemo />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
