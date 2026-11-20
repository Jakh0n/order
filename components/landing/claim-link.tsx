"use client";

import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { checkSlug } from "@/lib/auth/signup-actions";
import { slugError, slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

type Status = "idle" | "checking" | "free" | "taken" | "invalid";

/**
 * "Type your café's name": the owner sees their own link (and whether it's free) and a tiny
 * store page with their name, then claims it — /signup opens with the name filled in.
 */
export function ClaimLink({ host }: { host: string }) {
  const t = useTranslations("home.claim");
  const [name, setName] = useState("");
  const slug = slugify(name);
  const shownName = name.trim() || t("placeholderName");
  // Result of the last finished check, for the slug it was made for
  const [checked, setChecked] = useState<{ slug: string; status: Status } | null>(null);
  const invalid = slug !== "" && slugError(slug) !== null;
  const status: Status = !slug
    ? "idle"
    : invalid
      ? "invalid"
      : checked?.slug === slug
        ? checked.status
        : "checking";

  // Debounced availability check (checkSlug is rate limited per IP)
  useEffect(() => {
    if (!slug || invalid) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      let next: Status = "idle";
      try {
        const result = await checkSlug(slug);
        next = result.available ? "free" : result.error === "tooMany" ? "idle" : "taken";
      } catch {
        // Network hiccup: just don't show a badge
      }
      if (!cancelled) setChecked({ slug, status: next });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [slug, invalid]);

  const href = name.trim() ? `/signup?${new URLSearchParams({ name: name.trim() })}` : "/signup";

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      <div>
        <h2 className="font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
          {t("title")}
        </h2>
        <p className="text-forest/70 mt-4 max-w-lg text-lg leading-relaxed">{t("lead")}</p>

        <label htmlFor="claim-name" className="text-forest/80 mt-8 block text-sm font-semibold">
          {t("label")}
        </label>
        <input
          id="claim-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="organization"
          placeholder={t("placeholder")}
          className="border-forest/15 focus-visible:border-primary focus-visible:ring-primary/20 mt-2 h-14 w-full rounded-2xl border bg-white px-5 text-lg font-medium outline-none focus-visible:ring-4"
        />

        {/* The link itself + whether it's free */}
        <div className="mt-4 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="bg-forest/5 text-forest rounded-full px-4 py-2 font-mono text-[15px] break-all">
            {host}/<b className="text-primary">{slug || t("placeholderSlug")}</b>
          </span>
          <StatusBadge status={status} />
        </div>

        <Link
          href={href}
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-6 h-13 rounded-full px-7 text-base shadow-[0_12px_30px_-12px] shadow-red-700/50",
          )}
        >
          {status === "free" ? t("ctaClaim", { link: `${host}/${slug}` }) : t("cta")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {/* Their store, already with their name on it */}
      <div className="relative mx-auto w-full max-w-[300px]" aria-hidden>
        <div className="rounded-[2.5rem] bg-[#1c211f] p-[9px] shadow-[0_40px_80px_-40px_rgba(18,55,42,0.5)]">
          <div className="overflow-hidden rounded-[2rem] bg-white">
            <div className="flex h-8 items-center justify-center bg-neutral-100 text-[10px] text-black/50">
              <span className="truncate px-6 font-mono">
                {host}/{slug || t("placeholderSlug")}
              </span>
            </div>
            <div className="from-primary/80 to-saffron/80 h-24 bg-gradient-to-br" />
            <div className="px-4 pb-5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={shownName.charAt(0).toUpperCase()}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-primary font-display relative -mt-7 flex size-14 items-center justify-center rounded-2xl text-2xl font-bold text-white ring-4 ring-white"
                >
                  {shownName.charAt(0).toUpperCase()}
                </motion.div>
              </AnimatePresence>
              <p className="font-display mt-2 truncate text-lg font-bold">{shownName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-black/55">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {t("open")}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {[0.9, 0.7, 0.8].map((w, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="size-12 shrink-0 rounded-xl bg-neutral-100" />
                    <span className="flex flex-1 flex-col gap-1.5">
                      <span
                        className="h-2.5 rounded-full bg-neutral-200"
                        style={{ width: `${w * 100}%` }}
                      />
                      <span className="h-2 w-1/2 rounded-full bg-neutral-100" />
                    </span>
                    <span className="flex size-7 items-center justify-center rounded-full text-black/40 ring-1 ring-black/10">
                      +
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations("home.claim");
  if (status === "idle") return null;
  const styles = {
    checking: "bg-black/5 text-black/55",
    free: "bg-emerald-50 text-emerald-700",
    taken: "bg-red-50 text-red-700",
    invalid: "bg-red-50 text-red-700",
  } as const;
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
        styles[status],
      )}
      aria-live="polite"
    >
      {status === "checking" && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {status === "free" && <Check className="size-4" aria-hidden />}
      {(status === "taken" || status === "invalid") && <X className="size-4" aria-hidden />}
      {t(`status.${status}`)}
    </span>
  );
}
