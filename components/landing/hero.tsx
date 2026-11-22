"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import type { LandingDemo } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

import { Explainer } from "./explainer/explainer";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero({
  demo,
  link,
}: {
  demo: LandingDemo | null;
  /** Demo store link without the scheme ("tezda.app/bahor-kafe") */
  link: string;
}) {
  const t = useTranslations("home.hero");
  const reduce = useReducedMotion();

  const title = t("title");
  const words = title.split(" ");

  return (
    <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
      {/* Phones: headline → video → lead and buttons, so the video is on the first screen.
          Desktop: text on the left (two rows), video on the right. */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-8 lg:gap-y-0">
        <div className="max-w-xl lg:col-start-1 lg:row-start-1 lg:self-end">
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
        </div>

        {/* Product video: still until the visitor presses Play */}
        {demo && (
          <motion.div
            className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.25 }}
          >
            <Explainer demo={demo} link={link} />
          </motion.div>
        )}

        <div className="max-w-xl lg:col-start-1 lg:row-start-2 lg:self-start">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
          >
            <p className="text-forest/70 max-w-md text-lg leading-relaxed lg:mt-6">{t("lead")}</p>
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
                    "h-13 w-full rounded-full px-7 text-base shadow-[0_12px_30px_-12px] shadow-red-700/50 sm:w-auto",
                  )}
                >
                  {t("cta")}
                </Link>
              </motion.span>
              <Link
                href="/bahor-kafe"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "text-forest h-13 rounded-full px-5 text-base",
                )}
              >
                {t("demo")}
              </Link>
            </div>
            <p className="text-forest/55 mt-5 text-sm">{t("note")}</p>
            {/* Facts an owner checks first */}
            <ul className="mt-6 flex flex-wrap gap-2">
              {(t.raw("chips") as string[]).map((chip, i) => (
                <motion.li
                  key={chip}
                  className="border-forest/10 text-forest/80 flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-medium"
                  initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.8 + i * 0.08 }}
                >
                  <span className="bg-primary size-1.5 rounded-full" aria-hidden />
                  {chip}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
