"use client";

import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { triggerSentryTest } from "@/lib/superadmin/actions";

/** Server va brauzer xatolarini Sentry'ga yuboradi */
export function SentryTest() {
  const t = useTranslations("superadmin");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 text-sm">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            Sentry.captureException(
              new Error(`Sentry test error (browser) ${new Date().toISOString()}`),
            );
            await triggerSentryTest().catch(() => {});
            toast.success(t("sentrySent"));
          })
        }
      >
        {t("sentryTest")}
      </Button>
      <span className="text-muted-foreground">{t("sentryTestHint")}</span>
    </div>
  );
}
