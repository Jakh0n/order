import { MessageSquareText, Star } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ReviewVisibility } from "@/components/admin/reviews/review-visibility";
import { Stars } from "@/components/storefront/reviews-section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOwner } from "@/lib/auth/owner";
import { listReviews } from "@/lib/reviews/data";
import { cn } from "@/lib/utils";

export default function WebsiteReviewsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Reviews />
      </Suspense>
    </div>
  );
}

async function Reviews() {
  const { store } = await requireOwner();
  const [reviews, t, format] = await Promise.all([
    listReviews(store.id),
    getTranslations("reviews"),
    getFormatter(),
  ]);
  const visible = reviews.filter((r) => !r.isHidden);
  const average = visible.length
    ? visible.reduce((sum, r) => sum + r.rating, 0) / visible.length
    : 0;
  const byStars = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: visible.filter((r) => r.rating === s).length,
  }));

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">{t("adminTitle")}</h1>
        <p className="text-muted-foreground text-sm">{t("adminLead")}</p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
          <MessageSquareText className="size-8 opacity-50" aria-hidden />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <>
          <section className="bg-card grid gap-4 rounded-xl border p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
            <div className="flex flex-col items-center gap-1">
              <p className="text-4xl font-black tabular-nums">{average.toFixed(1)}</p>
              <Stars rating={average} />
              <p className="text-muted-foreground text-xs">
                {t("count", { count: visible.length })}
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {byStars.map(({ stars, count }) => (
                <li key={stars} className="flex items-center gap-2 text-sm">
                  <span className="flex w-8 items-center gap-0.5 tabular-nums">
                    {stars}
                    <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                  </span>
                  <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                    <span
                      className="block h-full rounded-full bg-amber-400"
                      style={{ width: `${visible.length ? (count / visible.length) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="text-muted-foreground w-6 text-right text-xs tabular-nums">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <ul className="bg-card divide-y rounded-xl border">
            {reviews.map((r) => (
              <li key={r.id} className={cn("flex flex-col gap-2 p-4", r.isHidden && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-medium">{r.customerName}</span>
                  <span className="text-muted-foreground text-xs">
                    {format.dateTime(r.createdAt, {
                      dateStyle: "medium",
                      timeZone: store.timeZone,
                    })}
                  </span>
                  {r.isHidden && <Badge variant="secondary">{t("hidden")}</Badge>}
                  <span className="ml-auto flex items-center gap-1">
                    <Link
                      href={`/admin/orders?q=${r.order.number}&tab=all`}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      #{r.order.number}
                    </Link>
                    <ReviewVisibility id={r.id} hidden={r.isHidden} />
                  </span>
                </div>
                {r.comment && <p className="text-sm">{r.comment}</p>}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">{t("sectionHint")}</p>
        </>
      )}
    </>
  );
}
