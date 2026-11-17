import { BRAND, MARK_SMALL } from "@/lib/brand";

/**
 * Full-bleed Tezda app tile for ImageResponse (apple-icon, PWA icons).
 * The OS rounds the corners itself; `markScale` keeps the mark inside the maskable safe zone.
 */
export function BrandIconTile({ size, markScale = 0.64 }: { size: number; markScale?: number }) {
  const mark = Math.round(size * markScale);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundImage: `linear-gradient(135deg, ${BRAND.gradientFrom}, ${BRAND.gradientTo})`,
      }}
    >
      <svg viewBox="14 13 230 230" width={mark} height={mark}>
        <path fill="#fff" d={MARK_SMALL.dash} />
        <circle fill="#fff" cx={MARK_SMALL.dot.cx} cy={MARK_SMALL.dot.cy} r={MARK_SMALL.dot.r} />
      </svg>
    </div>
  );
}
