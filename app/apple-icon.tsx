import { ImageResponse } from "next/og";

import { BrandIconTile } from "@/components/brand/icon-tile";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon (iOS): the Tezda "— •" mark on the red gradient. */
export default function AppleIcon() {
  return new ImageResponse(<BrandIconTile size={180} markScale={0.7} />, size);
}
