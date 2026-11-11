"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setReviewHidden } from "@/lib/reviews/actions";

export function ReviewVisibility({ id, hidden }: { id: string; hidden: boolean }) {
  const t = useTranslations("reviews");
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="gap-1.5"
      onClick={() =>
        startTransition(async () => {
          const result = await setReviewHidden(id, !hidden);
          if (!result.ok) toast.error(t(`errors.${result.error}`));
        })
      }
    >
      {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      {hidden ? t("show") : t("hide")}
    </Button>
  );
}
