"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Phones: once the hero is scrolled past, the signup button stays at the bottom of the screen */
export function StickyCta({ label, note }: { label: string; note: string }) {
  const { scrollY } = useScroll();
  const [show, setShow] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 700;
    setShow(y > 640 && !nearEnd);
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        >
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-full text-base")}
          >
            {label}
          </Link>
          <p className="text-forest/55 mt-1.5 text-center text-xs">{note}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
