import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";
import { reportError } from "@/lib/report-error";

// Bazadagi qat'iy oyna (fixed window) hisoblagichi. Vercel'da instansiyalar xotira ulashmaydi,
// shuning uchun hisob Postgres'da — bitta atomik so'rov.

export interface RateLimitRule {
  /** Nomi + identifikator, masalan "login:ip" */
  name: string;
  limit: number;
  windowSeconds: number;
}

export const RULES = {
  loginIp: { name: "login:ip", limit: 20, windowSeconds: 15 * 60 },
  loginEmail: { name: "login:email", limit: 10, windowSeconds: 15 * 60 },
  signupIp: { name: "signup:ip", limit: 5, windowSeconds: 60 * 60 },
  orderIp: { name: "order:ip", limit: 10, windowSeconds: 10 * 60 },
  orderPhone: { name: "order:phone", limit: 5, windowSeconds: 10 * 60 },
  slugCheckIp: { name: "slug:ip", limit: 60, windowSeconds: 60 },
  uploadUser: { name: "upload:user", limit: 60, windowSeconds: 60 * 60 },
  geocodeIp: { name: "geocode:ip", limit: 10, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * So'rov yuborgan IP (Vercel: x-forwarded-for ning birinchisi). Aniqlanmasa null —
 * aks holda hamma bitta "unknown" hisobiga tushib, bir-birini bloklab qo'yadi.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
}

/** Kalitda shaxsiy ma'lumot (email, telefon) ochiq saqlanmasin */
function keyFor(rule: RateLimitRule, id: string) {
  const hashed = createHash("sha256").update(id.toLowerCase()).digest("base64url").slice(0, 22);
  return `${rule.name}:${hashed}`;
}

/**
 * Hisoblagichni oshiradi. Cheklovdan oshgan bo'lsa false.
 * Baza xatosida true (cheklov xizmatni to'xtatib qo'ymasin).
 */
export async function rateLimit(rule: RateLimitRule, id: string | null): Promise<boolean> {
  if (!id) return true; // identifikator yo'q (masalan, IP aniqlanmadi) — bu qoida o'tkazib yuboriladi
  const key = keyFor(rule, id);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, now() + make_interval(secs => ${rule.windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now()
          THEN now() + make_interval(secs => ${rule.windowSeconds})
          ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;

    // Eskirgan yozuvlarni vaqti-vaqti bilan tozalash
    if (Math.random() < 0.01) {
      await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
    }
    return (rows[0]?.count ?? 0) <= rule.limit;
  } catch (e) {
    reportError(e, "rateLimit", { rule: rule.name });
    return true;
  }
}

/** Bir nechta qoidani tekshiradi — hammasi hisoblanadi, biri oshsa false */
export async function rateLimitAll(checks: [RateLimitRule, string | null][]): Promise<boolean> {
  const results = await Promise.all(checks.map(([rule, id]) => rateLimit(rule, id)));
  return results.every(Boolean);
}
