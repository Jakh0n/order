import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import sharp from "sharp";

import { defaultLocale, isLocale } from "@/i18n/config";
import { siteOrigin } from "@/lib/app-url";
import { reportError } from "@/lib/report-error";
import { productImages, topItemNames } from "@/lib/seo";
import { clip, firstLine, isAlwaysOpen } from "@/lib/seo-text";
import { BRAND, BRAND_NAME } from "@/lib/brand";
import { isHexColor } from "@/lib/design";
import { getStoreLocale, getStorefront } from "@/lib/storefront";

export const size = { width: 1200, height: 630 };
// JPEG: a photo as PNG is ~750 KB, too big for chat link previews
export const contentType = "image/jpeg";

const INK = BRAND.ink;
const MUTED = "#55555f";
const PHOTO_W = 480;

/** The link preview shown when a store link is shared in WhatsApp, Telegram, Instagram or search. */
export default async function Image({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const [data, storeLocale] = await Promise.all([getStorefront(slug), getStoreLocale(slug)]);
  // The preview speaks the store's own language (same as its page by default)
  const t = await getTranslations({
    locale: storeLocale && isLocale(storeLocale) ? storeLocale : defaultLocale,
    namespace: "seo",
  });

  if (!data || data.store.isBlocked) {
    return toJpeg(new ImageResponse(<Fallback />, size));
  }

  const { store } = data;
  // Collage: one big dish on top, two below (or a single photo / the cover)
  const urls = productImages(data, 3);
  const [logo, ...photos] = await Promise.all([
    loadPhoto(store.logoUrl, 192, 192, "contain"),
    ...(urls.length >= 3
      ? [
          loadPhoto(urls[0], PHOTO_W, 360),
          loadPhoto(urls[1], PHOTO_W / 2, 270),
          loadPhoto(urls[2], PHOTO_W / 2, 270),
        ]
      : [loadPhoto(urls[0] ?? store.coverUrl, PHOTO_W, 630)]),
  ]);
  const [big, small1, small2] = photos;
  // The store's brand colour, like its page; Tezda red otherwise (the page's default too)
  const accent = isHexColor(store.brandColor) ? store.brandColor : BRAND.red;
  // The owner's own tagline ("Halal kebab, open 24/7") beats a list of dish names
  const tagline = clip(firstLine(store.description), 90) || topItemNames(data, 3).join(" · ");
  const hours = isAlwaysOpen(store)
    ? t("ogOpen24")
    : t("ogHours", { open: store.openTime ?? "", close: store.closeTime ?? "" });
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
          {logo ? (
            <img
              src={logo}
              alt=""
              width={96}
              height={96}
              style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                objectFit: "contain",
                background: "#ffffff",
                border: "2px solid #ececec",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 96,
                height: 96,
                borderRadius: 28,
                background: accent,
                color: "#fff",
                fontSize: 52,
                fontWeight: 700,
              }}
            >
              {store.name.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div
            style={{
              marginTop: 36,
              fontSize: store.name.length > 22 ? 60 : 76,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {store.name}
          </div>
          {tagline && (
            <div style={{ marginTop: 20, fontSize: 32, color: MUTED, lineHeight: 1.3 }}>
              {tagline}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 18px",
                borderRadius: 999,
                background: "#e8f7ee",
                color: "#137a43",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 999, background: "#16a05d" }} />
              {hours}
            </div>
            {store.rating.count > 0 && (
              <div
                style={{
                  display: "flex",
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "#fff6e0",
                  color: "#8a5a00",
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                {`★ ${store.rating.average.toFixed(1)} (${store.rating.count})`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 36, gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "16px 34px",
                borderRadius: 999,
                background: accent,
                color: "#fff",
                fontSize: 28,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {t("ogStoreCta")}
            </div>
            <div style={{ fontSize: 26, color: MUTED, whiteSpace: "nowrap" }}>
              {`${host}/${store.slug}`}
            </div>
          </div>
        </div>
        {big && !small1 && (
          <img
            src={big}
            alt=""
            width={PHOTO_W}
            height={630}
            style={{ width: PHOTO_W, height: 630 }}
          />
        )}
        {big && small1 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: PHOTO_W,
              height: 630,
              gap: 6,
              background: "#ffffff",
            }}
          >
            <img
              src={big}
              alt=""
              width={PHOTO_W}
              height={357}
              style={{ width: PHOTO_W, height: 357 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <img
                src={small1}
                alt=""
                width={237}
                height={267}
                style={{ width: 237, height: 267 }}
              />
              {small2 && (
                <img
                  src={small2}
                  alt=""
                  width={237}
                  height={267}
                  style={{ width: 237, height: 267 }}
                />
              )}
            </div>
          </div>
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
async function loadPhoto(
  url: string | null | undefined,
  width: number,
  height: number,
  /** contain: the whole picture on white (logos); cover: fill the box (dish photos) */
  fit: "cover" | "contain" = "cover",
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit, background: "#ffffff" })
      .flatten({ background: "#ffffff" })
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
        background: BRAND.ink,
        color: "#fff",
        fontSize: 96,
        fontWeight: 700,
      }}
    >
      {BRAND_NAME}
    </div>
  );
}
