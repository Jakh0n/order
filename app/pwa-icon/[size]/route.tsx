import { ImageResponse } from "next/og";

import { BrandIconTile } from "@/components/brand/icon-tile";

const SIZES = [96, 192, 512] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

/** Admin app icons (manifest + notifications): the Tezda mark, inside the "maskable" safe zone */
export async function GET(_req: Request, { params }: RouteContext<"/pwa-icon/[size]">) {
  const { size: raw } = await params;
  const size = SIZES.find((s) => String(s) === raw) ?? 192;
  return new ImageResponse(<BrandIconTile size={size} />, { width: size, height: size });
}
