// Works on both server and client. Every store has its own IANA time zone (Store.timeZone).

interface StoreHours {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  timeZone: string;
}

export const DEFAULT_TIME_ZONE = "UTC";

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/** Wall-clock parts of `now` in the given time zone */
function zonedParts(now: Date, timeZone: string) {
  const tz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Is the store taking orders now: isOpen + opening hours in its time zone (overnight hours supported). */
export function isStoreOpenNow(store: StoreHours, now: Date = new Date()): boolean {
  if (!store.isOpen) return false;
  if (!store.openTime || !store.closeTime) return true;

  const open = toMinutes(store.openTime);
  const close = toMinutes(store.closeTime);
  if (open === null || close === null || open === close) return true;

  const { hour, minute } = zonedParts(now, store.timeZone);
  const current = hour * 60 + minute;
  return open < close ? current >= open && current < close : current >= open || current < close; // e.g. 18:00–02:00
}

/** Closed because of opening hours → opening time ("09:00"); otherwise null */
export function opensAt(store: StoreHours, now: Date = new Date()): string | null {
  if (!store.isOpen || !store.openTime || !store.closeTime) return null;
  return isStoreOpenNow(store, now) ? null : store.openTime;
}

/** Start of "today" in the store's time zone, as a UTC Date (for "today's revenue"). */
export function startOfDayInZone(timeZone: string, now: Date = new Date()): Date {
  const p = zonedParts(now, timeZone);
  // Offset of the zone at this moment = wall clock (as if UTC) − real UTC time
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offsetMs = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offsetMs);
}
