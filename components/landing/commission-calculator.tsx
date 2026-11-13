"use client";

import { animate, useMotionValue, useReducedMotion, useTransform, motion } from "motion/react";
import { useLocale } from "next-intl";
import { useEffect, useId, useState } from "react";

/**
 * "What does commission cost you?" — the owner moves three sliders and sees the monthly
 * commission on orders from their own customers. Pure arithmetic on their inputs; no claim
 * about any specific aggregator's rate (the default is just a starting point).
 */
export function CommissionCalculator({
  labels,
  avg,
}: {
  labels: {
    orders: string;
    average: string;
    rate: string;
    perMonth: string;
    perYear: string;
    unit: string;
  };
  /** Average order slider in the visitor's usual amounts (25 000 so'm vs 15 dollars) */
  avg: { initial: number; max: number; step: number };
}) {
  const locale = useLocale();
  const [orders, setOrders] = useState(20);
  const [average, setAverage] = useState(avg.initial);
  const [rate, setRate] = useState(20);
  const monthly = Math.round(orders * 30 * average * (rate / 100));
  // Grouping by hand: Node's and the browser's ICU disagree for some locales (uz), which breaks
  // hydration. "60,000" in English, "60 000" in Russian / Uzbek.
  const separator = locale === "en" ? "," : "\u00a0";
  const number = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return (
    <div className="grid gap-8 rounded-[2.5rem] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(18,55,42,.45)] ring-1 ring-black/5 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="flex flex-col gap-7">
        <Slider
          label={labels.orders}
          value={orders}
          display={number(orders)}
          min={1}
          max={200}
          step={1}
          onChange={setOrders}
        />
        <Slider
          label={labels.average}
          value={average}
          display={number(average)}
          min={avg.step}
          max={avg.max}
          step={avg.step}
          onChange={setAverage}
        />
        <Slider
          label={labels.rate}
          value={rate}
          display={`${rate}%`}
          min={5}
          max={40}
          step={1}
          onChange={setRate}
        />
        <p className="text-forest/50 text-xs">{labels.unit}</p>
      </div>
      <div className="bg-forest flex flex-col justify-center rounded-[2rem] p-7 text-white sm:p-9">
        <p className="text-white/70">{labels.perMonth}</p>
        <p className="font-display mt-2 text-5xl font-bold tracking-[-0.03em] tabular-nums sm:text-6xl">
          <AnimatedNumber value={monthly} format={number} />
        </p>
        <p className="mt-4 text-white/70">
          {labels.perYear}{" "}
          <span className="font-semibold text-white tabular-nums">{number(monthly * 12)}</span>
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-forest/75 font-medium">
          {label}
        </label>
        <span className="font-display text-forest text-2xl font-bold tabular-nums">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, oklch(0.6 0.16 152) ${pct}%, #e6efe9 ${pct}%)`,
        }}
      />
    </div>
  );
}

/** Counts to the new value instead of jumping (instant with reduced motion) */
function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}
