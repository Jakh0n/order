import type { BrowserOptions, NodeOptions } from "@sentry/nextjs";

import { scrubEvent } from "@/lib/sentry-scrub";

/** Brauzer va server uchun umumiy kesishma */
type Options = BrowserOptions & NodeOptions;

/** Server, edge va brauzer uchun umumiy sozlamalar */
export function sentryOptions(dsn: string | undefined): Options {
  return {
    dsn,
    // Faqat DSN bor va production build bo'lsa (lokal dev'da shovqin bo'lmasin)
    enabled: !!dsn && process.env.NODE_ENV === "production",
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // SENTRY_DEBUG=1 — yuborilgan event'larni konsolda ko'rish (sozlashni tekshirish uchun)
    debug: process.env.SENTRY_DEBUG === "1",
    // Sentry v11 standart holatda deyarli hammasini yig'adi. Bizda so'rov tanasi — checkout formasi
    // (mijoz telefoni, manzili), shuning uchun shaxsiy ma'lumot bo'lishi mumkin bo'lgan hammasi o'chiq.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { allow: ["user-agent", "referer", "accept-language", "content-type"] },
        response: false,
      },
      httpBodies: [],
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    beforeSend: scrubEvent,
  };
}
