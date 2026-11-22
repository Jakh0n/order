import { type NextRequest, NextResponse } from "next/server";

import {
  encodeGoogleState,
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_MAX_AGE_SECONDS,
  googleAuthUrl,
  newGoogleState,
} from "@/lib/auth/google";
import { safeNext } from "@/lib/auth/google-token";

/** "Continue with Google": /api/auth/google?from=login|signup&next=/admin/... → Google */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = params.get("from") === "signup" ? "signup" : "login";
  // The round trip must stay on this host (state cookie), so not APP_URL
  const origin = request.nextUrl.origin;

  const value = newGoogleState(from, safeNext(params.get("next")));
  const url = googleAuthUrl(origin, value);
  if (!url) {
    return NextResponse.redirect(new URL(from === "signup" ? "/signup" : "/admin/login", origin));
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_STATE_COOKIE, encodeGoogleState(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Google's redirect back is a top-level GET — "lax" cookies are sent with it
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: GOOGLE_STATE_MAX_AGE_SECONDS,
  });
  return response;
}
