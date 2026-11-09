import type { ErrorEvent } from "@sentry/nextjs";

// Mijozlarning shaxsiy ma'lumotlari (telefon, email) Sentry'ga ketmasin.
// sendDefaultPii: false — IP, cookie, foydalanuvchi; bu esa xabar matnlaridagi qoldiqlar uchun.

// International phones: "+1 (555) 123-4567", "+447911123456", or a bare 9–15 digit run
const PHONE = /\+\d[\d\s().-]{5,18}\d|\b\d{9,15}\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function scrubText(text: string): string {
  return text.replace(PHONE, "[phone]").replace(EMAIL, "[email]");
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubText(ex.value);
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = scrubText(crumb.message);
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data; // Server Action argumentlari (checkout formasi) yuborilmaydi
    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }
  }
  delete event.user;
  return event;
}
