"use client";

import { CalendarRange } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * "Custom range" pill next to the period presets: opens a small panel with two native date
 * inputs (good pickers on phones) and applies them as ?from=&to= so the page stays shareable.
 */
export function DateRangePicker({
  active,
  summary,
  from,
  to,
  today,
  labels,
}: {
  /** A custom range is the current period */
  active: boolean;
  /** Pill text: "Custom" or the formatted range when active */
  summary: string;
  from: string;
  to: string;
  today: string;
  labels: { from: string; to: string; apply: string; invalid: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState({ from, to });
  const ref = useRef<HTMLDivElement>(null);
  const invalid = !range.from || !range.to || range.from > range.to;

  // Close on outside click and Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setRange({ from, to });
          setOpen((o) => !o);
        }}
        className={cn(
          "flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
          active
            ? "border-primary bg-primary/5 text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <CalendarRange className="size-4" aria-hidden />
        <span className="tabular-nums">{summary}</span>
      </button>

      {open && (
        <form
          role="dialog"
          aria-label={summary}
          className="bg-popover text-popover-foreground absolute left-0 z-20 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-xl border p-4 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            if (invalid) return;
            setOpen(false);
            router.replace(
              `/admin/analytics?${new URLSearchParams({ from: range.from, to: range.to })}`,
            );
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="range-from">{labels.from}</Label>
              <Input
                id="range-from"
                type="date"
                required
                max={range.to || today}
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="range-to">{labels.to}</Label>
              <Input
                id="range-to"
                type="date"
                required
                min={range.from}
                max={today}
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
          </div>
          {invalid && range.from && range.to && (
            <p className="text-destructive text-xs" role="alert">
              {labels.invalid}
            </p>
          )}
          <Button type="submit" disabled={invalid}>
            {labels.apply}
          </Button>
        </form>
      )}
    </div>
  );
}
