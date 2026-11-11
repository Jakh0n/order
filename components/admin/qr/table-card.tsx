import type { TableQr } from "@/lib/table-qr";
import { cn } from "@/lib/utils";

/** Stand-up card for one table: store name, "Table 5", QR, call to action */
export function TableCard({
  table,
  storeName,
  label,
  cta,
  size = "md",
}: {
  table: TableQr;
  storeName: string;
  label: string;
  cta: string;
  /** "sm" — preview grid on the QR page; "md" — print sheet */
  size?: "sm" | "md";
}) {
  return (
    <article
      className={cn(
        "bg-background flex break-inside-avoid flex-col items-center text-center",
        size === "sm" ? "gap-2 rounded-xl border p-3" : "gap-3 rounded-2xl border p-6",
        "print:h-[99mm] print:justify-center print:gap-3 print:rounded-none print:border-dashed print:p-[8mm]",
      )}
    >
      <p
        className={cn(
          "text-muted-foreground max-w-full truncate font-medium",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {storeName}
      </p>
      <p
        className={cn(
          "leading-none font-extrabold tracking-tight",
          size === "sm" ? "text-xl" : "text-3xl",
        )}
      >
        {label}
      </p>
      <div
        className={cn(size === "sm" ? "size-24" : "size-40", "print:size-[52mm] [&>svg]:size-full")}
        role="img"
        aria-label={table.url}
        dangerouslySetInnerHTML={{ __html: table.svg }}
      />
      <p className={cn("font-semibold", size === "sm" ? "text-[11px] leading-tight" : "text-sm")}>
        {cta}
      </p>
    </article>
  );
}
