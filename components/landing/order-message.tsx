"use client";

import { CheckCheck } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/** Demo order — the same format a real order arrives in (see lib/order-message.ts). */
export const DEMO_ORDER = {
  number: 1042,
  items: [
    { name: "Doner Combo", price: 12.99 },
    { name: "Fries", price: 3.99 },
    { name: "Ayran", price: 2.49 },
  ],
  delivery: 2.99,
};

export const usd = (n: number) => `$${n.toFixed(2)}`;
export const demoSubtotal = DEMO_ORDER.items.reduce((s, i) => s + i.price, 0);
export const demoTotal = demoSubtotal + DEMO_ORDER.delivery;

type Line = { key: string; node: React.ReactNode; gap?: boolean };

function lines(): Line[] {
  return [
    { key: "h", node: <b>Order #{DEMO_ORDER.number}</b> },
    ...DEMO_ORDER.items.map((item, i) => ({
      key: `i${i}`,
      gap: i === 0,
      node: (
        <span className="flex justify-between gap-3">
          <span>
            <b>1x</b> {item.name}
          </span>
          <span className="tabular-nums">{usd(item.price)}</span>
        </span>
      ),
    })),
    {
      key: "sub",
      gap: true,
      node: (
        <span className="flex justify-between gap-3">
          <span>Item total ({DEMO_ORDER.items.length})</span>
          <span className="tabular-nums">{usd(demoSubtotal)}</span>
        </span>
      ),
    },
    {
      key: "del",
      node: (
        <span className="flex justify-between gap-3">
          <span>Delivery</span>
          <span className="tabular-nums">{usd(DEMO_ORDER.delivery)}</span>
        </span>
      ),
    },
    {
      key: "tot",
      node: (
        <b className="flex justify-between gap-3">
          <span>Total</span>
          <span className="tabular-nums">{usd(demoTotal)}</span>
        </b>
      ),
    },
    {
      key: "cus",
      gap: true,
      node: (
        <span>
          Customer: <b>Sam</b>
        </span>
      ),
    },
    {
      key: "svc",
      node: (
        <span>
          Service: <b>Delivery</b>
          <span className="block text-black/60">└ 18 Harbor Street, Apt 4</span>
          <span className="block text-[#027eb5]">└ 📍 maps.google.com/?q=…</span>
        </span>
      ),
    },
    {
      key: "pay",
      node: (
        <span>
          Payment: <b>Cash</b> (unpaid)
        </span>
      ),
    },
  ];
}

/**
 * WhatsApp-style outgoing bubble with the order text.
 * `animate` reveals the lines one by one, `read` turns the ticks blue.
 */
export function OrderMessage({
  animate = false,
  read = true,
  className,
}: {
  animate?: boolean;
  read?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "bg-bubble relative rounded-2xl rounded-tr-sm px-3 pt-2 pb-1.5 text-[12.5px] leading-[1.45] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]",
        className,
      )}
      initial={animate ? { opacity: 0, scale: 0.92, y: 12 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      style={{ transformOrigin: "100% 100%" }}
    >
      <motion.div
        initial={animate ? "hidden" : false}
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } } }}
      >
        {lines().map((line) => (
          <motion.div
            key={line.key}
            className={line.gap ? "mt-2" : undefined}
            variants={{ hidden: { opacity: 0, y: 4 }, shown: { opacity: 1, y: 0 } }}
          >
            {line.node}
          </motion.div>
        ))}
      </motion.div>
      <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-black/45">
        7:42 PM
        <CheckCheck
          className={cn(
            "size-3.5 transition-colors duration-500",
            read ? "text-[#53bdeb]" : "text-black/40",
          )}
          aria-hidden
        />
      </div>
    </motion.div>
  );
}
