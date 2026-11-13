"use client";

import { CheckCircle2, ExternalLink, RefreshCw, Send, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  createTelegramGroupLink,
  disconnectTelegramGroup,
  sendTelegramTest,
} from "@/lib/telegram/actions";

/** Settings → "Orders in a Telegram group": link the store's staff group to the Flami bot */
export function TelegramGroup({ title, connected }: { title: string | null; connected: boolean }) {
  const t = useTranslations("telegramGroup");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  // Coming back from Telegram after adding the bot → show the new state
  useEffect(() => {
    if (!link || connected) return;
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [link, connected, router]);

  function run(action: () => Promise<{ ok: boolean; error?: string; url?: string }>, ok?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t(`errors.${result.error ?? "server"}`));
        return;
      }
      if (result.url) setLink(result.url);
      if (ok) toast.success(ok);
    });
  }

  return (
    <section className="grid gap-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-8">
      <div className="md:pt-1">
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("hint")}</p>
      </div>
      <div className="bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-4 sm:p-5">
        {connected ? (
          <>
            <p className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden />
              <span>
                {t("connected")} <span className="font-semibold">{title ?? t("untitled")}</span>
              </span>
            </p>
            <p className="text-muted-foreground text-sm">{t("connectedHint")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => run(sendTelegramTest, t("testSent"))}
              >
                <Send className="size-4" aria-hidden />
                {t("test")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => run(disconnectTelegramGroup, t("disconnected"))}
              >
                <Unlink className="size-4" aria-hidden />
                {t("disconnect")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
            </ol>
            {link ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ className: "gap-2" })}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  {t("open")}
                </a>
                <Button type="button" variant="outline" onClick={() => router.refresh()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t("check")}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="w-fit"
                disabled={pending}
                onClick={() => run(createTelegramGroupLink)}
              >
                <Send className="size-4" aria-hidden />
                {t("connect")}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
