import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import { defaultLocale } from "@/i18n/config";
import { siteOrigin } from "@/lib/app-url";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOREST = "#12372a";
const GREEN = "#16a05d";
const FLAME =
  "M16 2.5c1.6 3.6 6.9 6.8 8.9 11.4 2.6 6-1.4 13.6-8.9 13.6-1.9 0-3.6-.4-5.1-1.2L5.5 28l1.3-5.1C5.6 21 5 18.9 5.3 16.6 6 11.4 10.8 9.7 12.4 5.3c.9 2.3 1 4 .6 5.9 1.9-1.6 3-4.8 3-8.7Z";

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
        background: FOREST,
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg viewBox="0 0 32 32" width={64} height={64}>
          <path d={FLAME} fill={GREEN} />
        </svg>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>Flami</div>
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
      <div style={{ fontSize: 28, color: "#7fd8a8" }}>{host}</div>
    </div>,
    size,
  );
}
