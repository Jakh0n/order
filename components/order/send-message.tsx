"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// We can't know if the message was really sent (t.me / wa.me only open the chat),
// so after the first tap the button steps back instead of disappearing.
// Remembered per browser — the customer usually returns on the same phone.
const storageKey = (orderId: string) => `order-sent:${orderId}`;

function readSent(orderId: string): boolean {
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

export function SendMessage({
  orderId,
  href,
  channel,
}: {
  orderId: string;
  href: string;
  channel: "TELEGRAM" | "WHATSAPP";
}) {
  const t = useTranslations("order");
  const stored = useSyncExternalStore(
    subscribe,
    () => readSent(orderId),
    () => false,
  );
  const [clicked, setClicked] = useState(false);
  const sent = stored || clicked;

  function markSent() {
    setClicked(true);
    try {
      localStorage.setItem(storageKey(orderId), "1");
    } catch {
      // localStorage may be blocked — the state still holds for this visit
    }
  }

  const label = channel === "TELEGRAM" ? t("sendTelegram") : t("sendWhatsapp");

  if (sent) {
    return (
      <>
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          {t("sentHint")}
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground text-sm underline underline-offset-2"
        >
          {t("notSent")}
        </a>
      </>
    );
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">{t("savedHint")}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={markSent}
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-13 w-full rounded-2xl text-base text-white",
          channel === "TELEGRAM"
            ? "bg-[#229ED9] hover:bg-[#1d8cc2]"
            : "bg-[#25D366] hover:bg-[#1fb857]",
        )}
      >
        <Send />
        {label}
      </a>
    </>
  );
}
