import { Check, CheckCheck, ChevronLeft, Mic, Paperclip } from "lucide-react";

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

/**
 * Telegram's doodle wallpaper: the default green gradient with a faint line pattern on top
 * (inline SVG, no request).
 */
const DOODLES =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' fill='none' stroke='%23365f2a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' opacity='.1'%3E%3Ccircle cx='18' cy='20' r='7'/%3E%3Cpath d='M70 12l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z'/%3E%3Cpath d='M98 60c6-8 16-8 16 0s-10 12-16 18c-6-6-16-10-16-18s10-8 16 0z'/%3E%3Cpath d='M14 70h22M25 59v22'/%3E%3Cpath d='M52 92c4-6 12-6 16 0'/%3E%3Ccircle cx='92' cy='104' r='4'/%3E%3Cpath d='M40 40l8 8M48 40l-8 8'/%3E%3C/svg%3E\")";

export function TelegramWallpaper({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative", TELEGRAM_WALLPAPER, className)}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: DOODLES, backgroundSize: "120px 120px" }}
        aria-hidden
      />
      {children}
    </div>
  );
}

/** iOS status bar + notch, dark text on the light Telegram header */
export function PhoneStatusBar({ time }: { time: string }) {
  return (
    <div className="relative flex h-8 shrink-0 items-center justify-between bg-[#f7f7f7] px-6 text-[11px] font-semibold text-[#111]">
      <span>{time}</span>
      <span className="absolute top-2 left-1/2 h-[20px] w-[78px] -translate-x-1/2 rounded-full bg-[#1c211f]" />
      <span className="flex items-center gap-1">
        <span className="flex items-end gap-px">
          {[3, 5, 7, 9].map((h) => (
            <span key={h} className="w-[3px] rounded-[1px] bg-current" style={{ height: h }} />
          ))}
        </span>
        <span className="h-2.5 w-4 rounded-[3px] border border-current p-px">
          <span className="block h-full w-3/4 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}

/** iOS Telegram chat header: "‹ Chats", name + status in the middle, avatar on the right */
export function TelegramHeader({
  back,
  unread,
  title,
  subtitle,
  subtitleOnline = false,
  avatar,
}: {
  back: string;
  unread?: number;
  title: string;
  subtitle: string;
  subtitleOnline?: boolean;
  avatar: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-black/10 bg-[#f7f7f7]/95 px-2.5 pb-1.5 text-[#111] backdrop-blur">
      <span className="flex w-16 items-center gap-0.5 text-[12px]" style={{ color: TELEGRAM_BLUE }}>
        <ChevronLeft className="-ml-1 size-5" strokeWidth={2.5} />
        {unread ? (
          <span
            className="rounded-full px-1.5 text-[10px] leading-4 font-semibold text-white"
            style={{ backgroundColor: TELEGRAM_BLUE }}
          >
            {unread}
          </span>
        ) : (
          back
        )}
      </span>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-[13px] leading-tight font-semibold">{title}</p>
        <p
          className="truncate text-[10.5px] leading-tight"
          style={{ color: subtitleOnline ? TELEGRAM_BLUE : "rgba(0,0,0,0.45)" }}
        >
          {subtitle}
        </p>
      </div>
      <span className="flex w-16 justify-end">{avatar}</span>
    </div>
  );
}

/** Round avatar: photo, or the first letter on Telegram's orange gradient */
export function TelegramAvatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#ffb36b] to-[#f2754e] text-[13px] font-semibold text-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny decorative avatar
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

/** "Today" pill above the first message */
export function TelegramDate({ label }: { label: string }) {
  return (
    <span className="mx-auto mb-1 block w-fit rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-medium text-white">
      {label}
    </span>
  );
}

/** Message bar: paperclip, field, mic (or the send button when there's text) */
export function TelegramComposer({
  placeholder,
  children,
  send,
}: {
  placeholder: string;
  /** Text waiting in the field */
  children?: React.ReactNode;
  /** Render the send button instead of the mic */
  send?: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex shrink-0 items-end gap-2 border-t border-black/10 bg-[#f7f7f7] px-2.5 pt-1.5 pb-4">
      <Paperclip className="mb-1.5 size-[18px] shrink-0 text-black/45" />
      <div className="flex max-h-16 min-h-7 flex-1 items-center overflow-hidden rounded-2xl border border-black/10 bg-white px-2.5 py-1 text-[10px] leading-snug text-black/80">
        {children ?? <span className="text-black/35">{placeholder}</span>}
      </div>
      {send ?? <Mic className="mb-1.5 size-[18px] shrink-0 text-black/45" />}
    </div>
  );
}
