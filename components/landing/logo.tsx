import { cn } from "@/lib/utils";

/** Flami wordmark: a flame-shaped speech bubble — orders that arrive as messages. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <path
          d="M16 2.5c1.6 3.6 6.9 6.8 8.9 11.4 2.6 6-1.4 13.6-8.9 13.6-1.9 0-3.6-.4-5.1-1.2L5.5 28l1.3-5.1C5.6 21 5 18.9 5.3 16.6 6 11.4 10.8 9.7 12.4 5.3c.9 2.3 1 4 .6 5.9 1.9-1.6 3-4.8 3-8.7Z"
          className={inverted ? "fill-white" : "fill-primary"}
        />
        <path
          d="M16.3 15.2c.9 1.8 3.3 3 3.3 5.4a3.6 3.6 0 0 1-7.2.2c0-1.6 1-2.4 1.7-3.3.4.8.5 1.4.4 2 1-.8 1.8-2.3 1.8-4.3Z"
          className={inverted ? "fill-forest" : "fill-white"}
        />
      </svg>
      <span
        className={cn(
          "font-display text-xl font-bold tracking-tight",
          inverted ? "text-white" : "text-forest",
        )}
      >
        Flami
      </span>
    </span>
  );
}
