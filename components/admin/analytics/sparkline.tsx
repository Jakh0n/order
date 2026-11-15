/**
 * Tiny trend line for a KPI tile (one value per day). Decorative: the tile's number and
 * ▲▼ change carry the meaning, so it is hidden from screen readers. Flat line when all zero.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 4) return null; // fewer than 4 points: the number says it better
  const W = 100;
  const H = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);
  const points = values.map((v, i) => [i * step, H - 2 - ((v - min) / span) * (H - 4)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className={className}>
      <polygon points={area} className="fill-primary/10" />
      <polyline
        points={line}
        fill="none"
        className="stroke-primary"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
