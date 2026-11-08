"use client";

import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

export function StoreLink({ slug, appUrl }: { slug: string; appUrl: string | null }) {
  const t = useTranslations("adminSettings");
  // NEXT_PUBLIC_APP_URL bo'lmasa — brauzerdagi manzil (serverda noma'lum)
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => appUrl ?? window.location.origin,
    () => appUrl,
  );
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = origin ? `${origin.replace(/\/$/, "")}/${slug}` : null;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then((data) => !cancelled && setQr(data))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard ruxsat berilmagan — foydalanuvchi qo'lda nusxalaydi
    }
  }

  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div>
        <h2 className="font-semibold">{t("linkSection")}</h2>
        <p className="text-muted-foreground text-xs">{t("linkHint")}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element -- data: URL, optimizatsiya kerak emas
            <img src={qr} alt={url ?? ""} className="size-full" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <a
            href={url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex items-center gap-1.5 font-medium break-all"
          >
            {url}
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!url}>
              {copied ? <Check /> : <Copy />}
              {copied ? t("copied") : t("copy")}
            </Button>
            {qr && (
              <a
                href={qr}
                download={`${slug}-qr.png`}
                className="hover:bg-muted inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[0.8rem] font-medium"
              >
                <Download className="size-3.5" />
                {t("downloadQr")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
