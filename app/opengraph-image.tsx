import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import { defaultLocale } from "@/i18n/config";
import { siteOrigin } from "@/lib/app-url";
import { BRAND, BRAND_NAME, MARK } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";


/** Link preview for the landing page. */
export default async function Image() {
  const t = await getTranslations({ locale: defaultLocale, namespace: "seo" });
  const host = new URL(siteOrigin()).host.replace(/^www\./, "");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: BRAND.ink,
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg viewBox="24 92 212 72" width={106} height={36}>
          <path d={MARK.dash} fill="#fff" />
          <circle cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} fill={BRAND.red} />
        </svg>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>{BRAND_NAME}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2.5,
            maxWidth: 980,
          }}
        >
          {t("ogHomeTitle")}
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: "rgba(255,255,255,0.7)", maxWidth: 900 }}>
          {t("ogHomeBody")}
        </div>
      </div>
      <div style={{ fontSize: 28, color: "#ff8a8f" }}>{host}</div>
    </div>,
    size,
  );
}
