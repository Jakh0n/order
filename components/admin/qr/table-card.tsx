import { ChevronRight, ScanLine, Send, UtensilsCrossed } from "lucide-react";

import type { TableQr } from "@/lib/table-qr";

export interface TableCardText {
  /** "Table" — small label above the number */
  table: string;
  /** "Scan to see the menu and order" */
  cta: string;
  steps: [scan: string, choose: string, order: string];
}

/**
 * Stand-up card for one table. Everything is sized in container units (cqw), so the same design
 * scales from the small preview on the QR page to the printed A4 card without changing proportions.
 */
export function TableCard({
  table,
  store,
  text,
  footer,
}: {
  table: TableQr;
  store: { name: string; logoUrl: string | null };
  text: TableCardText;
  /** Small line at the bottom (site host) */
  footer?: string;
}) {
  const stepIcons = [ScanLine, UtensilsCrossed, Send];

  return (
    // Print: each cell is a cut-out area with a dashed border; the card sits inside it
    <div className="@container break-inside-avoid print:flex print:h-[148mm] print:items-stretch print:border print:border-dashed print:border-neutral-300 print:p-[6mm]">
      <article className="relative flex w-full flex-col items-center overflow-hidden rounded-[6cqw] bg-white text-neutral-900 shadow-sm ring-1 ring-black/10 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:shadow-none">
        {/* Brand header */}
        <header className="from-primary to-primary/80 relative flex w-full flex-col items-center gap-[2.5cqw] bg-gradient-to-br px-[6cqw] pt-[7cqw] pb-[12cqw] text-white">
          <span
            aria-hidden
            className="absolute -top-[12cqw] -right-[10cqw] size-[38cqw] rounded-full bg-white/10"
          />
          <span
            aria-hidden
            className="absolute -bottom-[16cqw] -left-[12cqw] size-[34cqw] rounded-full bg-white/10"
          />
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- printed card; plain img prints reliably
            <img
              src={store.logoUrl}
              alt=""
              className="relative size-[14cqw] rounded-[3.5cqw] bg-white object-cover ring-[0.8cqw] ring-white/40"
            />
          ) : (
            <span className="relative flex size-[14cqw] items-center justify-center rounded-[3.5cqw] bg-white/20 text-[7cqw] font-bold ring-[0.8cqw] ring-white/30">
              {store.name.charAt(0).toUpperCase()}
            </span>
          )}
          <p className="relative max-w-full truncate text-[5.5cqw] leading-tight font-bold">
            {store.name}
          </p>
        </header>

        {/* Table number tag, overlapping the header */}
        <div className="relative -mt-[8.5cqw] flex items-center gap-[3cqw] rounded-[4.5cqw] bg-white py-[2cqw] pr-[6cqw] pl-[5cqw] shadow-lg ring-1 ring-black/5">
          <span className="text-[3.4cqw] font-semibold tracking-[0.25em] text-neutral-500 uppercase">
            {text.table}
          </span>
          <span className="text-primary text-[14cqw] leading-none font-black tabular-nums">
            {table.number}
          </span>
        </div>

        {/* QR with scan-frame corners */}
        <div className="relative mt-[6cqw] p-[3.5cqw]">
          {(
            [
              "top-0 left-0 rounded-tl-[3cqw] border-t-[length:1.2cqw] border-l-[length:1.2cqw]",
              "top-0 right-0 rounded-tr-[3cqw] border-t-[length:1.2cqw] border-r-[length:1.2cqw]",
              "bottom-0 left-0 rounded-bl-[3cqw] border-b-[length:1.2cqw] border-l-[length:1.2cqw]",
              "right-0 bottom-0 rounded-br-[3cqw] border-r-[length:1.2cqw] border-b-[length:1.2cqw]",
            ] as const
          ).map((corner) => (
            <span
              key={corner}
              aria-hidden
              className={`border-primary absolute size-[9cqw] ${corner}`}
            />
          ))}
          <div
            className="size-[46cqw] [&>svg]:size-full"
            role="img"
            aria-label={table.url}
            // Generated locally by the qrcode package from our own URL
            dangerouslySetInnerHTML={{ __html: table.svg }}
          />
        </div>

        <p className="mt-[4cqw] px-[8cqw] text-center text-[4.6cqw] leading-snug font-bold text-balance">
          {text.cta}
        </p>

        {/* Scan → Choose → Order */}
        <ol className="mt-[3.5cqw] flex items-center gap-[1.5cqw] text-[3.2cqw] font-medium text-neutral-600">
          {text.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <li key={step} className="flex items-center gap-[1.5cqw]">
                {i > 0 && <ChevronRight aria-hidden className="size-[3.4cqw] text-neutral-300" />}
                <span className="bg-primary/10 text-primary flex size-[6cqw] items-center justify-center rounded-full">
                  <Icon aria-hidden className="size-[3.4cqw]" />
                </span>
                {step}
              </li>
            );
          })}
        </ol>

        {footer && (
          <p className="mt-auto pt-[4cqw] pb-[4.5cqw] text-[2.8cqw] tracking-wide text-neutral-400">
            {footer}
          </p>
        )}
        {!footer && <span className="pb-[5cqw]" />}
      </article>
    </div>
  );
}
