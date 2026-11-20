// Signup attribution: where a new store owner came from.
// proxy.ts writes a first-touch cookie on the landing page and /signup; signup() copies it onto the Store.
// No personal data: only campaign labels and the referring site's host. Edge-safe (no Node APIs).

export const ATTRIBUTION_COOKIE = "tz_src";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

/** Pages an owner lands on before signing up (diners on store pages are not tracked) */
export const ATTRIBUTION_PATHS = new Set(["/", "/signup"]);

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
}

/** Lowercase, safe characters only, short — query params are user input */
function clean(value: string | null | undefined): string | undefined {
  const v = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 64);
  return v || undefined;
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Attribution from a landing request, or null when there's nothing to record (a direct visit).
 * utm_source wins over ?ref=; the referrer counts only when it is another site.
 */
export function attributionFromRequest(
  params: URLSearchParams,
  referer: string | null,
  ownHost: string,
): Attribution | null {
  let referrer: string | undefined;
  if (referer) {
    try {
      const host = bareHost(new URL(referer).hostname);
      if (host !== bareHost(ownHost)) referrer = clean(host);
    } catch {
      // Malformed Referer header — ignore
    }
  }
  const attribution: Attribution = {
    source: clean(params.get("utm_source")) ?? clean(params.get("ref")),
    medium: clean(params.get("utm_medium")),
    campaign: clean(params.get("utm_campaign")),
    referrer,
  };
  return Object.values(attribution).some(Boolean) ? attribution : null;
}

export function encodeAttribution(a: Attribution): string {
  const params = new URLSearchParams();
  if (a.source) params.set("s", a.source);
  if (a.medium) params.set("m", a.medium);
  if (a.campaign) params.set("c", a.campaign);
  if (a.referrer) params.set("r", a.referrer);
  return params.toString();
}

/** Cookie value → Store fields (re-cleaned: the cookie can be edited by the visitor) */
export function decodeAttribution(value: string | undefined) {
  const params = new URLSearchParams(value ?? "");
  return {
    signupSource: clean(params.get("s")) ?? null,
    signupMedium: clean(params.get("m")) ?? null,
    signupCampaign: clean(params.get("c")) ?? null,
    signupReferrer: clean(params.get("r")) ?? null,
  };
}

/** Link from a Free store's "Made with" badge: the store's slug names the campaign */
export function badgeHref(slug: string): string {
  return `/?${new URLSearchParams({ ref: "badge", utm_campaign: slug })}`;
}
