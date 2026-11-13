"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * "Ask for a review" on a completed order: opens the customer's chat with a ready message
 * that links to their order page (where the review form is).
 * WhatsApp takes the text in the link; a Telegram link to a phone number can't, so the text
 * is copied first and the owner pastes it.
 */
export function AskReviewButton({
  channel,
  phone,
  text,
}: {
  channel: "TELEGRAM" | "WHATSAPP";
  phone: string;
  text: string;
}) {
  const t = useTranslations("adminOrders");
  const digits = phone.replace(/\D/g, "");

  function ask() {
    if (channel === "WHATSAPP") {
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      return;
    }
    // Start the copy while the click still counts as a user action, then open the chat
    // right away (opening after an await gets blocked as a popup in some browsers)
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast.success(t("reviewCopied")))
      .catch(() => {
        // Clipboard blocked: the chat still opens; the owner can type it
      });
    window.open(`https://t.me/+${digits}`, "_blank", "noopener");
  }

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 self-start" onClick={ask}>
      <Star className="size-4" aria-hidden />
      {t("askReview")}
    </Button>
  );
}
