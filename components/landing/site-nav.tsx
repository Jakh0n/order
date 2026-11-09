"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";

const LINKS = ["how", "features", "pricing", "faq"] as const;

export function SiteNav() {
  const t = useTranslations("home");
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled || open
          ? "bg-white/85 shadow-[0_1px_0_rgba(18,55,42,0.08)] backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="rounded-lg" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <ul className="hidden flex-1 items-center gap-1 text-sm font-medium md:flex">
          {LINKS.map((key) => (
            <li key={key}>
              <a
                href={`#${key}`}
                className="text-forest/70 hover:text-forest rounded-lg px-3 py-2 transition-colors"
              >
                {t(`nav.${key}`)}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/admin/login"
            className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}
          >
            {t("login")}
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), "rounded-full px-4")}>
            {t("signup")}
          </Link>
          <button
            type="button"
            className="hover:bg-forest/5 -mr-2 flex size-10 items-center justify-center rounded-full md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("nav.close") : t("nav.menu")}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            className="overflow-hidden md:hidden"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <ul className="flex flex-col gap-1 px-4 pt-1 pb-5">
              {LINKS.map((key) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    onClick={() => setOpen(false)}
                    className="font-display text-forest block rounded-xl px-2 py-2.5 text-2xl font-semibold"
                  >
                    {t(`nav.${key}`)}
                  </a>
                </li>
              ))}
              <li className="mt-2">
                <Link
                  href="/admin/login"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
                >
                  {t("login")}
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
