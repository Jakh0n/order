/**
 * Busy times: weekday × 2-hour block. Each cell shows its order count (not colour alone) and a
 * single-hue intensity; the legend explains the scale. Empty days/hours stay neutral.
 * The full grid is a table, so screen readers get rows and columns.
 */
export function Heatmap({
  grid,
  weekdays,
  caption,
  legendLess,
  legendMore,
}: {
  /** [weekday 0=Mon..6=Sun][hour 0..23] */
  grid: number[][];
  /** Localised short weekday names, Monday first */
  weekdays: string[];
  caption: string;
  legendLess: string;
  legendMore: string;
}) {
  // 2-hour blocks: 12 columns fit on a phone
  const blocks = grid.map((row) => Array.from({ length: 12 }, (_, b) => row[b * 2] + row[b * 2 + 1]));
  const max = Math.max(1, ...blocks.flat());
  const level = (v: number) => (v === 0 ? 0 : Math.ceil((v / max) * 4)); // 0..4
  const shade = ["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/70", "bg-primary"];
  const ink = ["text-transparent", "text-foreground", "text-foreground", "text-white", "text-white"];

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-[10px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th className="w-7" />
            {Array.from({ length: 12 }, (_, b) => (
              <th
                key={b}
                scope="col"
                className="text-muted-foreground pb-1 text-center font-normal tabular-nums"
              >
                {b % 2 === 0 ? String(b * 2).padStart(2, "0") : ""}
                <span className="sr-only">
                  {`${String(b * 2).padStart(2, "0")}:00–${String(b * 2 + 1).padStart(2, "0")}:59`}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blocks.map((row, d) => (
            <tr key={d}>
              <th scope="row" className="text-muted-foreground pr-1 text-left font-normal">
                {weekdays[d]}
              </th>
              {row.map((v, b) => (
                <td
                  key={b}
                  className={`h-7 rounded text-center font-semibold tabular-nums ${shade[level(v)]} ${ink[level(v)]}`}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-muted-foreground flex items-center justify-end gap-1.5 text-xs" aria-hidden>
        {legendLess}
        {shade.map((c) => (
          <span key={c} className={`size-3 rounded-sm ${c}`} />
        ))}
        {legendMore}
      </div>
    </div>
  );
}
