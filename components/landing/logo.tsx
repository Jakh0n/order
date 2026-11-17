import { cn } from "@/lib/utils";
import { BRAND, BRAND_NAME, MARK } from "@/lib/brand";

const WORDMARK =
  "M30 64V176A24 24 0 0 0 54 200H60M8 118H60 M106 159H188A41 41 0 1 0 180.6 182.5 M234 118H298L234 200H298 " +
  "M426 52V200M426 159A41 41 0 1 1 344 159A41 41 0 1 1 426 159 M554 118V200M554 159A41 41 0 1 1 472 159A41 41 0 1 1 554 159";

/** Tezda lockup: "— •" (Morse for "TE": the dot arrives in an instant) + the "tezda" wordmark. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  const ink = inverted ? "#fff" : BRAND.ink;
  return (
    <svg
      viewBox="0 36 965 180"
      className={cn("h-7 w-auto", className)}
      role="img"
      aria-label={BRAND_NAME}
    >
      <g transform="translate(-35.8 -41) scale(1.5625)">
        <path fill={ink} d={MARK.dash} />
        <circle fill={BRAND.red} cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} />
      </g>
      <path
        transform="translate(373.5 0)"
        fill="none"
        stroke={ink}
        strokeWidth={23}
        strokeLinecap="round"
        strokeLinejoin="round"
        d={WORDMARK}
      />
    </svg>
  );
}
