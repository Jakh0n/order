"use server";

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import type { z } from "zod";
import { redirect } from "next/navigation";

import { ATTRIBUTION_COOKIE, decodeAttribution } from "@/lib/attribution";
import { getCurrentUser } from "@/lib/auth/owner";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { readToken, SIGNUP_EMAIL_TOKEN } from "@/lib/auth/token";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { slugError } from "@/lib/slug";
import {
  type SignupInput,
  signupSchema,
  type SignupStoreInput,
  signupStoreSchema,
} from "@/lib/validators";
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

type SignupStore = z.output<typeof signupStoreSchema>;

/** New store defaults: open all day, pickup + cash/card. Delivery is switched on in Settings once the owner sets a delivery fee. */
function newStoreData(
  ownerId: string,
  store: SignupStore,
  attribution: ReturnType<typeof decodeAttribution>,
) {
  return {
    ownerId,
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
    ...attribution,
  } satisfies Prisma.StoreUncheckedCreateInput;
}

function fieldErrorsOf(error: z.ZodError, prefix = "") {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[prefix + issue.path.map(String).join(".")] ??= issue.message;
  }
  return fieldErrors;
}

export type SignupResult = {
  ok: false;
  error: "invalid" | "emailTaken" | "emailUnverified" | "slugTaken" | "tooMany" | "server";
  fieldErrors?: Record<string, string>;
};

/** Hisob + do'kon bitta tranzaksiyada (email kod bilan tasdiqlangan bo'lishi shart). Muvaffaqiyatda sessiya ochib /admin/menu ga yo'naltiradi. */
export async function signup(input: SignupInput, emailToken: string): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { email, password, store } = parsed.data;
  // The email was confirmed with an emailed code (lib/auth/email-actions.ts)
  if (readToken(SIGNUP_EMAIL_TOKEN, emailToken) !== email) {
    return { ok: false, error: "emailUnverified" };
  }

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

  // Where this owner came from (first-touch cookie from proxy.ts)
  const cookieStore = await cookies();
  const attribution = decodeAttribution(cookieStore.get(ATTRIBUTION_COOKIE)?.value);

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
      await tx.store.create({ data: newStoreData(created.id, store, attribution) });
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

  cookieStore.delete(ATTRIBUTION_COOKIE);
  await createSession(userId);
  // A brand-new store starts with "photo of your menu" (AI import)
  redirect("/admin/menu/import");
}

/**
 * Store step for an owner who signed in with Google (account exists, no store yet).
 * Muvaffaqiyatda /admin/menu/import ga yo'naltiradi.
 */
export async function createStore(input: SignupStoreInput): Promise<SignupResult> {
  const current = await getCurrentUser();
  if (!current) redirect("/signup");
  if (current.store) redirect("/admin/orders");

  const parsed = signupStoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fieldErrors: fieldErrorsOf(parsed.error, "store.") };
  }
  const store = parsed.data;

  if (!(await rateLimit(RULES.signupIp, await clientIp()))) return { ok: false, error: "tooMany" };

  const taken = await prisma.store.findUnique({ where: { slug: store.slug }, select: { id: true } });
  if (taken) return { ok: false, error: "slugTaken", fieldErrors: { "store.slug": "slugTaken" } };

  const cookieStore = await cookies();
  const attribution = decodeAttribution(cookieStore.get(ATTRIBUTION_COOKIE)?.value);
  try {
    await prisma.store.create({ data: newStoreData(current.user.id, store, attribution) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "slugTaken", fieldErrors: { "store.slug": "slugTaken" } };
    }
    reportError(e, "createStore");
    return { ok: false, error: "server" };
  }

  cookieStore.delete(ATTRIBUTION_COOKIE);
  redirect("/admin/menu/import");
}
