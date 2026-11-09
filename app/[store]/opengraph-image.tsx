import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import sharp from "sharp";

import { defaultLocale } from "@/i18n/config";
import { siteOrigin } from "@/lib/app-url";
import { reportError } from "@/lib/report-error";
import { firstProductImage, topItemNames } from "@/lib/seo";
import { getStorefront } from "@/lib/storefront";

export const size = { width: 1200, height: 630 };
// JPEG: a photo as PNG is ~750 KB, too big for chat link previews
export const contentType = "image/jpeg";

const FOREST = "#12372a";
const GREEN = "#16a05d";

/** The link preview shown when a store link is shared in WhatsApp, Telegram, Instagram or search. */
export default async function Image({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const [data, t] = await Promise.all([
    getStorefront(slug),
    getTranslations({ locale: defaultLocale, namespace: "seo" }),
  ]);

  if (!data || data.store.isBlocked) {
    return toJpeg(new ImageResponse(<Fallback />, size));
  }

  const { store } = data;
  const photo = await loadPhoto(firstProductImage(data) ?? store.logoUrl);
  const items = topItemNames(data, 3).join(" · ");
  const host = new URL(siteOrigin()).host.replace(/^www\./, "");

  return toJpeg(
    new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "0 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 28,
              background: GREEN,
              color: "#fff",
              fontSize: 52,
              fontWeight: 700,
            }}
          >
            {store.name.trim().charAt(0).toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 36,
              fontSize: store.name.length > 22 ? 60 : 76,
              fontWeight: 700,
              color: FOREST,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {store.name}
          </div>
          {items && (
            <div style={{ marginTop: 20, fontSize: 30, color: "#4b6359", lineHeight: 1.3 }}>
              {items}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", marginTop: 44, gap: 20 }}>
            <div
              style={{
                display: "flex",
                padding: "16px 32px",
                borderRadius: 999,
                background: GREEN,
                color: "#fff",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {t("ogStoreCta")}
            </div>
            <div style={{ fontSize: 26, color: "#4b6359" }}>{`${host}/${store.slug}`}</div>
          </div>
        </div>
        {photo && (
          <img
            src={photo}
            alt=""
            width={480}
            height={630}
            style={{ width: 480, height: 630, objectFit: "cover" }}
          />
        )}
      </div>,
      size,
    ),
  );
}

/** Re-encodes the rendered PNG as JPEG; previews are cached by the CDN for an hour. */
async function toJpeg(image: ImageResponse): Promise<Response> {
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer()))
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/**
 * The image renderer reads only PNG and JPEG, while menu uploads are WebP — so the photo
 * is resized and re-encoded as JPEG. A failed download means no photo, not a broken preview.
 */
async function loadPhoto(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(480, 630, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (e) {
    reportError(e, "og-image-photo");
    return null;
  }
}

function Fallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: FOREST,
        color: "#fff",
        fontSize: 96,
        fontWeight: 700,
      }}
    >
      Flami
    </div>
  );
}
