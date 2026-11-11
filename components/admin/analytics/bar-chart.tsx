"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export interface BarDatum {
  key: string;
  /** Short axis label ("Mon 11", "14") */
  axis: string;
  /** Tooltip heading ("Tue, Nov 11") */
  title: string;
  /** Tooltip value, already formatted ("₩19,384 · 3 orders") */
  detail: string;
  value: number;
}

/**
 * Single-series bar chart (one brand hue, no legend — the card title names it).
 * Bars sit on the baseline with rounded tops, 2px gaps, a recessive grid; every bar has a
 * hover / focus tooltip with a hit area the full column tall; a visually hidden table
 * carries the same data for screen readers.
 */
export function BarChart({
  data,
  label,
  maxLabel,
  tickEvery = 1,
  height = 160,
}: {
  data: BarDatum[];
  /** Accessible name of the chart */
  label: string;
  /** Formatted max value for the top gridline */
  maxLabel: string;
  /** Show every n-th axis label */
  tickEvery?: number;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const current = active !== null ? data[active] : null;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative" style={{ height }}>
        {/* Recessive grid: top (max) and middle lines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col justify-between"
        >
          <div className="border-border/70 relative border-t border-dashed">
            {max > 0 && (
              <span className="text-muted-foreground bg-card absolute -top-2.5 left-0 pr-1 text-[10px] tabular-nums">
                {maxLabel}
              </span>
            )}
          </div>
          <div className="border-border/50 border-t border-dashed" />
          <div className="border-border border-t" />
        </div>

        <div
          role="img"
          aria-label={label}
          className="absolute inset-0 flex items-end gap-[2px]"
          onMouseLeave={() => setActive(null)}
        >
          {data.map((d, i) => {
            const pct = max > 0 ? (d.value / max) * 100 : 0;
            return (
              <button
                key={d.key}
                type="button"
                aria-label={`${d.title}: ${d.detail}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                // The whole column is the hit target, not just the (maybe tiny) bar
                className="group flex h-full min-w-0 flex-1 items-end outline-none"
              >
                <span
                  className={cn(
                    "bg-primary w-full rounded-t-[4px] transition-opacity",
                    d.value > 0 ? "min-h-[3px]" : "bg-border h-px rounded-none",
                    active !== null && active !== i && "opacity-40",
                    "group-focus-visible:ring-ring group-focus-visible:ring-2",
                  )}
                  style={d.value > 0 ? { height: `${pct}%` } : undefined}
                />
              </button>
            );
          })}
        </div>

        {current && active !== null && (
          <div
            role="status"
            className="bg-popover text-popover-foreground pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md ring-1 ring-black/5"
            style={{
              left: `clamp(60px, ${((active + 0.5) / data.length) * 100}%, calc(100% - 60px))`,
            }}
          >
            <p className="font-semibold">{current.title}</p>
            <p className="text-muted-foreground tabular-nums">{current.detail}</p>
          </div>
        )}
      </div>

      {/* Axis labels (every n-th), centred under their bar and allowed to overflow it */}
      <div aria-hidden className="text-muted-foreground flex h-3 gap-[2px] text-[10px]">
        {data.map((d, i) => (
          <span key={d.key} className="relative min-w-0 flex-1">
            {i % tickEvery === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap tabular-nums">
                {d.axis}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>{d.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
