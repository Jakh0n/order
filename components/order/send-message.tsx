"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { CopyButton } from "@/components/copy-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The order reaches the store only when the customer presses Send inside Telegram / WhatsApp.
// We can't see that (t.me / wa.me only open the chat), so we never claim "sent":
// before the tap — a full-screen page with one button; after it — "did you press Send?" + open again.
// The page switches away from this block by itself once the store accepts (StatusWatcher).
// Remembered per browser — the customer usually returns on the same phone.
const storageKey = (orderId: string) => `order-sent:${orderId}`;

function readOpened(orderId: string): boolean {
  try {
    return localStorage.getItem(storageKey(orderId)) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const BRAND = {
  TELEGRAM: { app: "Telegram", className: "bg-[#229ED9] hover:bg-[#1d8cc2]" },
  WHATSAPP: { app: "WhatsApp", className: "bg-[#25D366] hover:bg-[#1fb857]" },
} as const;

export function SendMessage({
  orderId,
  number,
  href,
  text,
  channel,
  children,
}: {
  orderId: string;
  number: number;
  href: string;
  text: string;
  channel: "TELEGRAM" | "WHATSAPP";
  /** Scheduled time, date — shown under the heading */
  children?: React.ReactNode;
}) {
  const t = useTranslations("order");
  const stored = useSyncExternalStore(
    subscribe,
    () => readOpened(orderId),
    () => false,
  );
  const [clicked, setClicked] = useState(false);
  const opened = stored || clicked;
  const { app, className: brandClass } = BRAND[channel];

  function markOpened() {
    setClicked(true);
    try {
      localStorage.setItem(storageKey(orderId), "1");
    } catch {
      // localStorage may be blocked — the state still holds for this visit
    }
  }

  // Step 1 — nothing but the one action (full screen, like a checkout's last step).
  // The order page appears only after the chat was opened.
  if (!opened) {
    return (
      <div className="bg-background fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-6 py-10 text-center">
        <span
          className={cn(
            "flex size-20 items-center justify-center rounded-full text-white",
            brandClass,
          )}
        >
          <Send className="size-9 -translate-x-0.5 translate-y-0.5" aria-hidden />
        </span>
        <div className="flex max-w-sm flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            {t("savedTitle", { number })}
          </p>
          <h1 className="text-2xl font-bold">{t("sendTitle")}</h1>
          <p className="text-muted-foreground">{t("sendWhy")}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={markOpened}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-14 w-full max-w-sm rounded-2xl text-base font-semibold text-white",
            brandClass,
          )}
        >
          <Send />
          {t("openApp", { app })}
        </a>
        <p className="text-muted-foreground max-w-sm text-sm">{t("sendStep2")}</p>
      </div>
    );
  }

  // Step 2 — back from the chat: we can't know if Send was pressed, so ask, and keep the way back
  return (
    <section className="bg-background flex flex-col gap-4 rounded-2xl p-5">
      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        {t("savedTitle", { number })}
      </p>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t("sentCheckTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("sentCheckHint")}</p>
      </div>
      {children}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-12 w-full rounded-2xl text-base text-white",
          brandClass,
        )}
      >
        <Send />
        {t("openAgain", { app })}
      </a>
      {/* Some apps drop the prefilled text — the customer can still paste it */}
      <div className="bg-muted flex items-center justify-between gap-3 rounded-xl p-3">
        <p className="text-muted-foreground text-xs">{t("copyFallback")}</p>
        <CopyButton text={text} className="shrink-0" />
      </div>
    </section>
  );
}
