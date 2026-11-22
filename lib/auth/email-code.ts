import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import type { EmailCodePurpose } from "@prisma/client";

import { prisma } from "@/lib/db";

// One-time 6-digit codes sent by email. Only an HMAC is stored; 10 minutes, 5 wrong guesses.

const TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET o'rnatilmagan");
  return value;
}

function hashCode(email: string, purpose: EmailCodePurpose, code: string) {
  return createHmac("sha256", secret()).update(`${purpose}:${email}:${code}`).digest("base64url");
}

/** New code for this email (older ones for the same purpose stop working) */
export async function issueEmailCode(email: string, purpose: EmailCodePurpose): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await prisma.$transaction([
    prisma.emailCode.deleteMany({
      where: {
        OR: [{ email, purpose }, { expiresAt: { lt: new Date(now.getTime() - 24 * 3600_000) } }],
      },
    }),
    prisma.emailCode.create({
      data: {
        email,
        purpose,
        codeHash: hashCode(email, purpose, code),
        expiresAt: new Date(now.getTime() + TTL_MS),
      },
    }),
  ]);
  return code;
}

export type CodeCheck = "ok" | "wrong" | "expired";

/** Checks and, when right, uses up the code */
export async function consumeEmailCode(
  email: string,
  purpose: EmailCodePurpose,
  code: string,
): Promise<CodeCheck> {
  const row = await prisma.emailCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
    select: { id: true, codeHash: true, attempts: true, expiresAt: true },
  });
  if (!row || row.expiresAt < new Date() || row.attempts >= MAX_ATTEMPTS) return "expired";

  const expected = Buffer.from(row.codeHash);
  const actual = Buffer.from(hashCode(email, purpose, code));
  const right = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!right) {
    // Atomic: two parallel guesses can't both use the same attempt
    const { count } = await prisma.emailCode.updateMany({
      where: { id: row.id, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    return count === 0 || row.attempts + 1 >= MAX_ATTEMPTS ? "expired" : "wrong";
  }

  // deleteMany: a parallel request that already used it gets count 0
  const { count } = await prisma.emailCode.deleteMany({ where: { id: row.id } });
  return count === 1 ? "ok" : "expired";
}
