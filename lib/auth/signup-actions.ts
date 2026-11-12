"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { slugError } from "@/lib/slug";
import { type SignupInput, signupSchema } from "@/lib/validators";
import { reportError } from "@/lib/report-error";

export type SlugCheck = {
  available: boolean;
  error?: "slugInvalid" | "slugReserved" | "slugTaken" | "tooMany";
};

/** Ustada yozish paytida tekshirish (yakuniy tekshiruv baribir signup ichida) */
export async function checkSlug(slug: string): Promise<SlugCheck> {
  const value = String(slug ?? "")
    .trim()
    .toLowerCase();
  const error = slugError(value);
  if (error) return { available: false, error };
  if (!(await rateLimit(RULES.slugCheckIp, await clientIp()))) {
    return { available: false, error: "tooMany" };
  }

  const taken = await prisma.store.findUnique({ where: { slug: value }, select: { id: true } });
  return taken ? { available: false, error: "slugTaken" } : { available: true };
}

export type SignupResult = {
  ok: false;
  error: "invalid" | "emailTaken" | "slugTaken" | "tooMany" | "server";
  fieldErrors?: Record<string, string>;
};

/** Hisob + do'kon bitta tranzaksiyada. Muvaffaqiyatda sessiya ochib /admin/menu ga yo'naltiradi. */
export async function signup(input: SignupInput): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.map(String).join(".")] ??= issue.message;
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const { email, password, store } = parsed.data;

  // Soxta do'konlar oqimidan himoya
  if (!(await rateLimit(RULES.signupIp, await clientIp()))) return { ok: false, error: "tooMany" };

  const [emailTaken, slugTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.store.findUnique({ where: { slug: store.slug }, select: { id: true } }),
  ]);
  if (emailTaken) return { ok: false, error: "emailTaken", fieldErrors: { email: "emailTaken" } };
  if (slugTaken) {
    return { ok: false, error: "slugTaken", fieldErrors: { "store.slug": "slugTaken" } };
  }

  let userId: string;
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, role: "OWNER" },
        select: { id: true },
      });
      // Boshlang'ich sozlamalar: kun bo'yi ochiq, olib ketish + naqd/karta.
      // Delivery is switched on in Settings once the owner sets a delivery fee.
      await tx.store.create({
        data: {
          ownerId: created.id,
          slug: store.slug,
          name: store.storeName,
          currency: store.currency,
          timeZone: store.timeZone,
          locale: store.locale,
          channel: store.channel,
          telegramUsername: store.telegramUsername,
          whatsappNumber: store.whatsappNumber,
          pickupEnabled: true,
          deliveryEnabled: false,
          acceptCash: true,
          acceptCardOnDelivery: true,
          acceptTransfer: false,
          minOrder: 0,
        },
      });
      return created;
    });
    userId = user.id;
  } catch (e) {
    // Ikki kishi bir vaqtda bir xil email/slug bilan yuborsa
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? "");
      return target.includes("email")
        ? { ok: false, error: "emailTaken", fieldErrors: { email: "emailTaken" } }
        : { ok: false, error: "slugTaken", fieldErrors: { "store.slug": "slugTaken" } };
    }
    reportError(e, "signup");
    return { ok: false, error: "server" };
  }

  await createSession(userId);
  // A brand-new store starts with "photo of your menu" (AI import)
  redirect("/admin/menu/import");
}
