import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

import { decodeGoogleState, exchangeGoogleCode, GOOGLE_STATE_COOKIE } from "@/lib/auth/google";
import type { GoogleProfile } from "@/lib/auth/google-token";
import { homePathFor } from "@/lib/auth/owner";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, RULES } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

/**
 * Google sends the owner back here. Finds the account by Google id, then by (verified) email
 * — an existing email + password account gets Google linked — or creates a new one.
 * No store yet → /signup shows just the store step.
 */
export async function GET(request: NextRequest) {
  // The round trip must stay on this host (state cookie), so not APP_URL
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const saved = decodeGoogleState(request.cookies.get(GOOGLE_STATE_COOKIE)?.value);
  const back = saved?.from === "signup" ? "/signup" : "/admin/login";

  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return response;
  };
  const fail = (reason: "google" | "tooMany") => go(`${back}?error=${reason}`);

  // Cancelled on Google's screen — just go back, no error
  if (params.get("error") === "access_denied") return go(back);

  const code = params.get("code");
  if (!saved || !code || params.get("state") !== saved.state) return fail("google");

  if (!(await rateLimit(RULES.googleAuthIp, await clientIp()))) return fail("tooMany");

  let profile: GoogleProfile | null;
  try {
    profile = await exchangeGoogleCode(origin, code, saved.verifier);
  } catch (e) {
    reportError(e, "google-callback");
    return fail("google");
  }
  if (!profile) return fail("google");

  let user: Awaited<ReturnType<typeof findOrCreateUser>>;
  try {
    user = await findOrCreateUser(profile);
  } catch (e) {
    reportError(e, "google-user");
    return fail("google");
  }
  if (!user) return fail("google");

  await createSession(user.id);
  const hasStore = user._count.stores > 0;
  return go((hasStore && saved.next) || homePathFor(user.role, hasStore));
}

const userSelect = {
  id: true,
  role: true,
  googleId: true,
  _count: { select: { stores: true } },
} satisfies Prisma.UserSelect;

async function findOrCreateUser(profile: GoogleProfile, retry = true) {
  const [byGoogle, byEmail] = await Promise.all([
    prisma.user.findUnique({ where: { googleId: profile.sub }, select: userSelect }),
    prisma.user.findUnique({ where: { email: profile.email }, select: userSelect }),
  ]);
  if (byGoogle) return byGoogle;

  const existing = byEmail;
  if (existing) {
    // This email is already tied to another Google account
    if (existing.googleId) return null;
    return prisma.user.update({
      where: { id: existing.id },
      data: { googleId: profile.sub },
      select: userSelect,
    });
  }

  try {
    return await prisma.user.create({
      data: { email: profile.email, name: profile.name, googleId: profile.sub, role: "OWNER" },
      select: userSelect,
    });
  } catch (e) {
    // Two callbacks at once (double click) — the other one created it
    if (retry && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return findOrCreateUser(profile, false);
    }
    throw e;
  }
}
