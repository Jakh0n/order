import { cn } from "@/lib/utils";

const WIDTH = {
  /** Forms, lists of settings */
  narrow: "max-w-3xl",
  /** Most pages */
  default: "max-w-5xl",
  /** Order board, editors with a preview */
  wide: "max-w-7xl",
} as const;

/** Admin page container: centered, the same gutters and rhythm on every page */
export function PageShell({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof WIDTH;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-5 px-4 py-5 md:px-8 md:py-8",
        WIDTH[width],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page title + one-line purpose + actions (right on desktop, below on phones) */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Extra content under the title row (tabs, filters) */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1 max-w-prose text-sm">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Small KPI tile: icon, label, value (tabular), optional hint */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <section className={cn("bg-card flex items-start gap-3 rounded-xl border p-4", className)}>
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 className="text-muted-foreground text-xs font-medium">{label}</h2>
        <p className="mt-0.5 truncate text-xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
    </section>
  );
}
