"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { type Popup, popupActive, popupVersion } from "@/lib/popup";
import { cn } from "@/lib/utils";

const seenKey = (slug: string, popup: Popup) => `popup-seen:${slug}:${popupVersion(popup)}`;

/**
 * One-time store popup (Website → Appearance). `forceOpen` — the Design preview always shows it.
 * Shown once per visitor per version; hidden after its countdown ends.
 */
export function PromoPopup({
  slug,
  popup,
  forceOpen = false,
}: {
  slug: string;
  popup: Popup;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) return;
    if (!popupActive(popup)) return;
    try {
      if (localStorage.getItem(seenKey(slug, popup))) return;
    } catch {
      // Storage blocked: show it, it just won't be remembered
    }
    const id = window.setTimeout(() => setOpen(true), 800); // let the page settle first
    return () => window.clearTimeout(id);
  }, [slug, popup, forceOpen]);

  function close(next: boolean) {
    setOpen(next);
    if (!next && !forceOpen) {
      try {
        localStorage.setItem(seenKey(slug, popup), "1");
      } catch {
        // ignore
      }
    }
  }

  const visible = forceOpen ? popupActive(popup) : open;
  if (!visible && !open) return null;

  return (
    <Dialog open={visible} onOpenChange={forceOpen ? undefined : close}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        {popup.imageUrl && (
          <div className="relative aspect-[4/3] w-full">
            <Image src={popup.imageUrl} alt="" fill sizes="384px" className="object-cover" />
          </div>
        )}
        <div className="flex flex-col items-center gap-3 p-5 text-center">
          {popup.title && <DialogTitle className="text-xl font-bold">{popup.title}</DialogTitle>}
          {popup.text && (
            <DialogDescription className="text-muted-foreground text-sm whitespace-pre-line">
              {popup.text}
            </DialogDescription>
          )}
          {popup.endsAt && <Countdown endsAt={popup.endsAt} />}
          {popup.buttonLabel &&
            (popup.buttonLink ? (
              <a
                href={popup.buttonLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => close(false)}
                className={cn(buttonVariants({ size: "lg" }), "mt-1 w-full")}
              >
                {popup.buttonLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => close(false)}
                className={cn(buttonVariants({ size: "lg" }), "mt-1 w-full")}
              >
                {popup.buttonLabel}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Countdown({ endsAt }: { endsAt: string }) {
  const t = useTranslations("popup");
  const end = Date.parse(endsAt);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0); // first value right after mount, then every second
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  if (now === null) return null; // client only — avoids a server/client time mismatch
  const left = Math.max(0, end - now);
  const parts = [
    [Math.floor(left / 86_400_000), t("days")],
    [Math.floor(left / 3_600_000) % 24, t("hours")],
    [Math.floor(left / 60_000) % 60, t("minutes")],
    [Math.floor(left / 1000) % 60, t("seconds")],
  ] as const;

  return (
    <div className="flex gap-2" role="timer" aria-live="off">
      {parts.map(([value, label]) => (
        <div
          key={label}
          className="bg-primary/10 text-primary flex w-14 flex-col items-center rounded-xl py-2"
        >
          <span className="text-xl leading-none font-bold tabular-nums">
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}
