"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const key = (orderId: string) => `order-status:${orderId}`;

/**
 * Wraps the status card: when the status changed since the customer last looked
 * (auto-refresh or a later visit) — a toast, a short vibration and a highlight.
 */
export function StatusWatcher({
  orderId,
  number,
  status,
  children,
}: {
  orderId: string;
  number: number;
  status: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    let previous: string | null = null;
    try {
      previous = localStorage.getItem(key(orderId));
      localStorage.setItem(key(orderId), status);
    } catch {
      return;
    }
    if (!previous || previous === status) return;
    toast.success(t("order.statusChanged", { number, status: t(`status.${status}`) }));
    navigator.vibrate?.(200);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to an external (localStorage) value
    setChanged(true);
    const id = setTimeout(() => setChanged(false), 4000);
    return () => clearTimeout(id);
  }, [orderId, number, status, t]);

  return (
    <div
      className={cn(
        "rounded-2xl transition-shadow duration-700",
        changed && "ring-primary/40 ring-4",
      )}
    >
      {children}
    </div>
  );
}
