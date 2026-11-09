import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getCurrentOwner } from "@/lib/auth/owner";
import { prisma } from "@/lib/db";
import { receiptUrls } from "@/lib/storage";

/**
 * Receipt link from the order message (Telegram / WhatsApp): the store owner opens it and is
 * redirected to a short-lived signed URL. Not logged in → login, then back here.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/admin/receipt/[orderId]">) {
  const { orderId } = await ctx.params;
  if (!/^[a-z0-9]{20,40}$/i.test(orderId)) return notFound();

  const owner = await getCurrentOwner();
  if (!owner) redirect(`/admin/login?next=${encodeURIComponent(`/admin/receipt/${orderId}`)}`);

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: owner.store.id },
    select: { receiptPath: true },
  });
  if (!order?.receiptPath) return notFound();

  const url = (await receiptUrls([order.receiptPath])).get(order.receiptPath);
  if (!url) return notFound();
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
