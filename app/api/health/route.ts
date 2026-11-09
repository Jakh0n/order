import { connection } from "next/server";

import { prisma } from "@/lib/db";

/**
 * Uptime check for external monitors (Better Stack, UptimeRobot, etc.):
 * 200 when the app and the database respond, 503 otherwise. No secrets or data in the response.
 */
export async function GET() {
  await connection(); // always at request time, never prerendered or cached

  const started = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    return Response.json(
      { status: "ok", db: "ok", dbLatencyMs: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", db: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
