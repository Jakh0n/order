import * as Sentry from "@sentry/nextjs";

/**
 * try/catch ichida "yutilgan" xatolar uchun: foydalanuvchiga do'stona xabar qaytaramiz,
 * lekin xato Sentry'ga va server logiga baribir tushadi.
 */
export function reportError(error: unknown, where: string, extra?: Record<string, unknown>) {
  console.error(`${where} failed`, error);
  Sentry.captureException(error, { tags: { where }, extra });
}
