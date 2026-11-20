import { Check, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";

// Telegram look for the landing demos (light theme, default green wallpaper).

export const TELEGRAM_BLUE = "#229ED9";
export const TELEGRAM_WALLPAPER = "bg-[linear-gradient(160deg,#d5e3b3,#a3c38c_55%,#8fb67f)]";

/** Telegram markup of a real order message (lib/order-message.ts): **bold**, __italic__ */
export function TelegramText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line === "" ? (
          <span key={i} className="block h-1" />
        ) : (
          <span key={i} className="block">
            {line.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <b key={j}>{part.slice(2, -2)}</b>;
              }
              if (part.startsWith("__") && part.endsWith("__")) {
                return <i key={j}>{part.slice(2, -2)}</i>;
              }
              return part;
            })}
          </span>
        ),
      )}
    </>
  );
}

/** One chat bubble: incoming (white, left) or outgoing (green, right, with ticks) */
export function TelegramBubble({
  outgoing,
  time,
  read = true,
  className,
  children,
}: {
  outgoing: boolean;
  time: string;
  read?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // flow-root: the floated time stays inside the bubble after multi-line content
        "flow-root w-fit max-w-[85%] rounded-2xl px-2.5 pt-1.5 pb-1 text-[#111] shadow-[0_1px_0.5px_rgba(0,0,0,0.12)]",
        outgoing ? "ml-auto rounded-br-md bg-[#effdde]" : "rounded-bl-md bg-white",
        className,
      )}
    >
      {children}
      <span
        className={cn(
          "float-right mt-1 ml-2 flex translate-y-0.5 items-center gap-0.5 text-[0.75em] tabular-nums",
          outgoing ? "text-[#4fae4e]" : "text-black/40",
        )}
      >
        {time}
        {outgoing &&
          (read ? <CheckCheck className="size-[1.1em]" /> : <Check className="size-[1.1em]" />)}
      </span>
    </div>
  );
}
