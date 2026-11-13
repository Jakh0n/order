"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * One order in the list: a compact summary (tap → full details in a side sheet)
 * and the main "next step" button, which works without opening the sheet.
 * Summary, action and details are rendered on the server and passed in.
 */
export function OrderRow({
  label,
  title,
  muted,
  summary,
  action,
  details,
}: {
  /** Accessible name of the summary button ("Open order #12") */
  label: string;
  /** Sheet title for screen readers ("Order #12") */
  title: string;
  /** Cancelled: faded */
  muted?: boolean;
  summary: React.ReactNode;
  action?: React.ReactNode;
  details: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li
      className={cn(
        "bg-card flex items-stretch overflow-hidden rounded-xl border",
        muted && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="hover:bg-muted/50 focus-visible:ring-ring flex min-w-0 flex-1 cursor-pointer items-center gap-2 p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:p-4"
      >
        <div className="min-w-0 flex-1">{summary}</div>
        {!action && <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />}
      </button>
      {action && <div className="flex shrink-0 items-center pr-3 sm:pr-4">{action}</div>}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-4 pt-12 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          {details}
        </SheetContent>
      </Sheet>
    </li>
  );
}
