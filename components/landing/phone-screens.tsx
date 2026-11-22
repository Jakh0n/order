"use client";

import { ArrowLeft, Plus, Send, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { LandingDemo } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

import { useTyped } from "./motion-parts";
import { TELEGRAM_BLUE } from "./telegram";

// Phone screens of the customer path on the live demo store, driven by `step`
// (0 menu · 1–3 add dishes · 4 tap the cart · 5 checkout, contact typed in · 6 choose payment ·
// 7 "Place order"). Used by the landing explainer video.

// ---------- Menu ----------

export function MenuScreen({
  demo,
  step,
  money,
}: {
  demo: LandingDemo;
  step: number;
  money: (minor: number) => string;
}) {
  const t = useTranslations("home.demo");
  const tCart = useTranslations("cart");
  const added = demo.picks.slice(0, Math.min(step, demo.picks.length));
  const tapping = step >= 1 && step <= demo.picks.length ? demo.picks[step - 1] : null;
  const cartTotal = demo.products
    .filter((p) => added.includes(p.id))
    .reduce((s, p) => s + p.price, 0);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative h-28 shrink-0 overflow-hidden bg-neutral-200">
        {demo.store.coverUrl && (
          <Image src={demo.store.coverUrl} alt="" fill sizes="300px" className="object-cover" />
        )}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent" />
      </div>
      <div className="px-4">
        <div className="relative z-10 -mt-6 size-12 overflow-hidden rounded-2xl bg-white ring-4 ring-white">
          {demo.store.logoUrl ? (
            <Image src={demo.store.logoUrl} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <span className="bg-primary flex size-full items-center justify-center text-lg font-bold text-white">
              {demo.store.name.charAt(0)}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[15px] font-bold">{demo.store.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-black/55">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t("open")}
          <span className="text-black/25">|</span>
          {t("eta")}
        </p>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-hidden px-4 text-[11px] font-semibold whitespace-nowrap">
        {demo.categories.map((name, i) => (
          <span
            key={name}
            className={cn(
              "rounded-full px-2.5 py-1",
              i === 0 ? "bg-[#1c211f] text-white" : "bg-black/5",
            )}
          >
            {name}
          </span>
        ))}
      </div>
      <ul className="mt-2 flex flex-col px-3">
        {demo.products.map((p) => {
          const inCart = added.includes(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                <Image src={p.img} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{p.name}</p>
                <p className="truncate text-[11px] text-black/50">{p.note}</p>
                <p className="mt-0.5 text-[12px] font-semibold tabular-nums">{money(p.price)}</p>
              </div>
              <span className="relative flex size-8 shrink-0 items-center justify-center">
                {tapping === p.id && <TapRipple className="bg-primary/35" />}
                <motion.span
                  animate={{ scale: tapping === p.id ? [1, 0.82, 1] : 1 }}
                  transition={{ duration: 0.35 }}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                    inCart ? "bg-primary text-white" : "bg-white text-black ring-1 ring-black/15",
                  )}
                >
                  {inCart ? "1" : <Plus className="size-4" strokeWidth={2.5} />}
                </motion.span>
              </span>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {added.length > 0 && (
          <motion.div
            className="absolute inset-x-3 bottom-4 z-20"
            initial={{ y: 80 }}
            animate={{ y: 0, scale: step === 4 ? 0.95 : 1 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="bg-primary relative flex h-12 items-center gap-2.5 rounded-2xl px-3.5 text-white shadow-lg shadow-red-900/25">
              {step === 4 && <TapRipple className="left-1/2 -ml-4" />}
              <span className="relative">
                <ShoppingBag className="size-5" />
                <motion.span
                  key={added.length}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 18 }}
                  className="text-primary absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-bold"
                >
                  {added.length}
                </motion.span>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{tCart("view")}</span>
              <span className="text-sm font-semibold tabular-nums">{money(cartTotal)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Checkout ----------

export function CheckoutScreen({
  demo,
  step,
  money,
  animate,
}: {
  demo: LandingDemo;
  step: number;
  money: (minor: number) => string;
  animate: boolean;
}) {
  const t = useTranslations("checkout");
  const tPay = useTranslations("payment");
  const name = useTyped(demo.customer.name, animate, 150);
  const phone = useTyped(demo.customer.phone, animate, 650);
  const paid = step >= 6;
  const placing = step === 7;
  const items = demo.products.filter((p) => demo.picks.includes(p.id));
  // How far the form is taller than the screen: scrolled by exactly that, no empty gap below
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);
  useEffect(() => {
    if (!viewport.current || !content.current) return;
    setOverflow(Math.max(0, content.current.offsetHeight - viewport.current.clientHeight));
  }, []);

  return (
    <div className="flex h-full flex-col bg-neutral-50 pt-9 text-[#111]">
      <div className="flex items-center gap-2 px-3 pb-2">
        <ArrowLeft className="size-4" />
        <p className="text-[14px] font-bold">{t("title")}</p>
      </div>

      {/* The customer scrolls down to the payment choice (small phones cut it off otherwise) */}
      <div ref={viewport} className="min-h-0 flex-1 overflow-hidden">
        <motion.div
          ref={content}
          className="flex flex-col gap-2 px-3 pb-2"
          animate={{ y: paid ? -overflow : 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <Card title={t("summary")}>
            {items.map((p) => (
              <Row key={p.id} left={`1× ${p.name}`} right={money(p.price)} />
            ))}
          </Card>

          <Card title={t("contact")}>
            <Field label={t("name")} value={name} />
            <Field label={t("phone")} value={phone} />
          </Card>

          <Card title={t("type")}>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-0.5 text-center text-[10.5px] font-semibold">
              <span className="rounded-md py-1 text-black/50">{t("pickup")}</span>
              <span className="rounded-md bg-white py-1 shadow-sm">{t("delivery")}</span>
            </div>
            <Field label={t("address")} value={demo.customer.address} />
          </Card>

          <Card title={t("payment")}>
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px] font-semibold">
              {(["CASH", "CARD_ON_DELIVERY"] as const).map((m) => {
                const on = m === "CASH" && paid;
                return (
                  <span
                    key={m}
                    className={cn(
                      "relative flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 ring-1 transition-colors",
                      on ? "bg-primary/8 ring-primary" : "bg-white ring-black/10",
                    )}
                  >
                    {m === "CASH" && step === 6 && (
                      <TapRipple className="bg-primary/30 left-1 size-6" delay={0.4} />
                    )}
                    <span
                      className={cn(
                        "flex size-3 shrink-0 items-center justify-center rounded-full ring-1",
                        on ? "ring-primary" : "ring-black/25",
                      )}
                    >
                      {on && <span className="bg-primary size-1.5 rounded-full" />}
                    </span>
                    <span className="leading-tight">{tPay(m)}</span>
                  </span>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="border-t border-black/5 bg-white px-3 pt-2 pb-4">
        <Row left={t("subtotal")} right={money(demo.subtotal)} muted />
        <Row left={t("deliveryFee")} right={money(demo.deliveryFee)} muted />
        <motion.div
          animate={{ scale: placing ? 0.95 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="bg-primary relative mt-2 flex h-11 items-center justify-between rounded-2xl px-3.5 text-[13px] font-semibold text-white shadow-lg shadow-red-900/20"
        >
          {placing && <TapRipple className="left-1/2 -ml-4" />}
          <span>{t("submit")}</span>
          <span className="tabular-nums">{money(demo.total)}</span>
        </motion.div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-white p-2.5 ring-1 ring-black/5">
      <p className="text-[10px] font-semibold tracking-wide text-black/45 uppercase">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-2 py-1 ring-1 ring-black/10">
      <p className="text-[9px] text-black/45">{label}</p>
      <p className="h-4 truncate text-[11.5px] font-medium">{value}</p>
    </div>
  );
}

function Row({ left, right, muted }: { left: string; right: string; muted?: boolean }) {
  return (
    <p
      className={cn(
        "flex justify-between gap-2 text-[11px]",
        muted ? "text-black/55" : "font-medium",
      )}
    >
      <span className="truncate">{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </p>
  );
}

// ---------- "Send your order" ----------

export function SendScreen({ tapping }: { tapping: boolean }) {
  const t = useTranslations("order");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-white px-5 text-center">
      <span
        className="flex size-16 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: TELEGRAM_BLUE }}
      >
        <Send className="size-7 -translate-x-0.5" />
      </span>
      <p className="text-[15px] leading-snug font-bold text-[#111]">{t("sendTitle")}</p>
      <p className="text-[11.5px] leading-relaxed text-black/55">{t("sendWhy")}</p>
      <motion.span
        className="relative mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-white"
        style={{ backgroundColor: TELEGRAM_BLUE }}
        animate={tapping ? { scale: [1, 1, 0.95, 1] } : undefined}
        transition={{ duration: 1.4, times: [0, 0.7, 0.82, 1] }}
      >
        {tapping && <TapRipple className="left-1/2 -ml-4" delay={0.95} />}
        <Send className="size-4" />
        {t("openApp", { app: "Telegram" })}
      </motion.span>
    </div>
  );
}

// ---------- Shared ----------

export function TapRipple({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.span
      className={cn("pointer-events-none absolute size-8 rounded-full bg-white/45", className)}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: [0.5, 2], opacity: [0.9, 0] }}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
    />
  );
}

export function StatusBar({ light }: { light: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex h-9 items-center justify-between px-6 text-[11px] font-semibold transition-colors duration-300",
        light ? "text-white" : "text-[#111b21]",
      )}
    >
      <span>19:41</span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-4 rounded-[3px] border border-current p-px">
          <span className="block h-full w-3/4 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}
