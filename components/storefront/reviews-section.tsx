import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import type { StorefrontData } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

/** "What customers say" — the latest visible reviews with a comment (Storefront section) */
export function ReviewsSection({
  rating,
  reviews,
}: {
  rating: { average: number; count: number };
  reviews: StorefrontData["reviews"];
}) {
  const t = useTranslations("reviews");
  if (rating.count === 0) return null;

  return (
    <section className="px-3 py-1.5 sm:px-4" aria-labelledby="reviews-title">
      <div className="bg-background rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="reviews-title" className="text-lg font-bold">
            {t("title")}
          </h2>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
            {rating.average.toFixed(1)}
            <span className="text-muted-foreground font-normal">
              {t("count", { count: rating.count })}
            </span>
          </span>
        </div>
        {reviews.length > 0 && (
          <ul className="-mx-4 mt-3 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="bg-muted/60 flex w-64 shrink-0 snap-start flex-col gap-2 rounded-xl p-3"
              >
                <Stars rating={r.rating} />
                <p className="line-clamp-4 text-sm">“{r.comment}”</p>
                <p className="text-muted-foreground mt-auto text-xs font-medium">{r.name}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
