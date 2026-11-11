"use client";

import { Loader2, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

/** "How was your order?" — 1..5 stars + optional comment, once per completed order */
export function ReviewForm({
  orderId,
  existing,
}: {
  orderId: string;
  existing: { rating: number; comment: string | null } | null;
}) {
  const t = useTranslations("reviews");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(existing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <section className="bg-background flex flex-col items-center gap-2 rounded-2xl p-4 text-center">
        <span className="flex gap-0.5" aria-label={t("yourRating", { rating: done.rating })}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn(
                "size-5",
                i <= done.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              )}
              aria-hidden
            />
          ))}
        </span>
        <p className="text-sm font-medium">{t("thanks")}</p>
      </section>
    );
  }

  function send() {
    if (!rating) return;
    setError(null);
    startTransition(async () => {
      const result = await submitReview({ orderId, rating, comment });
      if (result.ok) setDone({ rating, comment });
      else setError(t(`errors.${result.error}`));
    });
  }

  const shown = hover || rating;
  return (
    <section className="bg-background flex flex-col gap-3 rounded-2xl p-4">
      <h2 className="font-bold">{t("ask")}</h2>
      <div className="flex justify-center gap-1" role="radiogroup" aria-label={t("ask")}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={t("stars", { count: i })}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            className="rounded-full p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "size-9",
                i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <div className={cn("flex flex-col gap-3", !rating && "hidden")}>
        <Textarea
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
          aria-label={t("commentPlaceholder")}
        />
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button type="button" onClick={send} disabled={pending} className="gap-2">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {t("send")}
        </Button>
      </div>
    </section>
  );
}
