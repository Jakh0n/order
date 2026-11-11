import "server-only";

import QRCode from "qrcode";

import { tableLink } from "@/lib/table-session-link";

export interface TableQr {
  number: number;
  url: string;
  /** Inline SVG markup, generated locally from our own URL */
  svg: string;
}

/** One QR per table, 1..count (QR page preview and the A4 print sheet) */
export function buildTableQrs(origin: string, slug: string, count: number): Promise<TableQr[]> {
  const base = origin.replace(/\/$/, "");
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const number = i + 1;
      const url = tableLink(base, slug, number);
      const svg = await QRCode.toString(url, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" },
      });
      return { number, url, svg };
    }),
  );
}
