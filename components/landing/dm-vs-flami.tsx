"use client";

import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import type { LandingDemo } from "@/lib/landing-demo";
import { cn } from "@/lib/utils";

import { CHAT_TIMES, minutesBetween } from "./chat-story";
import { TELEGRAM_WALLPAPER, TelegramBubble, TelegramText } from "./telegram";

/**
 * Reduced-motion version of the problem story, no animation:
 * left, an order pieced together over many Telegram messages; right, the same order from Tezda
 * in one complete message.
 */
export function DmVsFlami({
  messages,
  demo,
}: {
  /** Alternating customer / owner lines, customer first */
  messages: string[];
  demo: LandingDemo | null;
}) {
  const t = useTranslations("home.problem");
  const minutes = minutesBetween(CHAT_TIMES[0], CHAT_TIMES[messages.length - 1] ?? CHAT_TIMES[0]);

  return (
    <div className="mx-auto mt-10 grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2 md:gap-8">
      <div className={cn("flex flex-col rounded-[2rem] p-4 sm:p-6", TELEGRAM_WALLPAPER)}>
        <p className="mb-4 w-fit rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
          {t("dmStatus", { count: messages.length, minutes })}
        </p>
        <ul className="flex flex-col gap-1.5">
          {messages.map((text, i) => (
            <li key={i}>
              <TelegramBubble outgoing={i % 2 === 1} time={CHAT_TIMES[i] ?? ""} className="text-sm">
                {text}
              </TelegramBubble>
            </li>
          ))}
        </ul>
      </div>

      {demo && (
        <div className={cn("flex flex-col rounded-[2rem] p-4 sm:p-6", TELEGRAM_WALLPAPER)}>
          <p className="bg-primary mb-4 flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white">
            <CheckCheck className="size-4" aria-hidden />
            {t("tezdaStatus")}
          </p>
          <TelegramBubble
            outgoing={false}
            time={CHAT_TIMES[0]}
            className="max-w-[320px] text-xs leading-snug"
          >
            <TelegramText text={demo.message} />
          </TelegramBubble>
        </div>
      )}
    </div>
  );
}
