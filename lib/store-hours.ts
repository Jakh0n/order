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

/** Is the store open at this minute of the day (opening hours only, ignores isOpen). Overnight hours supported. */
function isOpenAtMinute(store: StoreHours, minuteOfDay: number): boolean {
  if (!store.openTime || !store.closeTime) return true;
  const open = toMinutes(store.openTime);
  const close = toMinutes(store.closeTime);
  if (open === null || close === null || open === close) return true;
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  return open < close ? m >= open && m < close : m >= open || m < close; // e.g. 18:00–02:00
}

/** Is the store taking orders now: isOpen + opening hours in its time zone (overnight hours supported). */
export function isStoreOpenNow(store: StoreHours, now: Date = new Date()): boolean {
  if (!store.isOpen) return false;
  const { hour, minute } = zonedParts(now, store.timeZone);
  return isOpenAtMinute(store, hour * 60 + minute);
}

// ---------- Scheduled orders ----------

/** Slot grid (minutes) */
export const SLOT_STEP = 15;
/** Earliest slot offered to the customer: now + this (preparation time) */
export const SLOT_LEAD = 30;

export interface TimeSlot {
  /** "HH:MM" — what is stored in Order.scheduledFor */
  value: string;
  /** Falls on the next calendar day (store time zone) */
  tomorrow: boolean;
}

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Times the customer can choose: from now + lead, on a 15-minute grid, until the end of the
 * next open session (at most ~24h ahead, so "HH:MM" is never ambiguous).
 * Manually closed store (isOpen = false) → no slots.
 */
export function timeSlots(
  store: StoreHours,
  now: Date = new Date(),
  lead: number = SLOT_LEAD,
): TimeSlot[] {
  if (!store.isOpen) return [];
  const { hour, minute } = zonedParts(now, store.timeZone);
  const current = hour * 60 + minute;
  const start = Math.ceil((current + lead) / SLOT_STEP) * SLOT_STEP;
  const slots: TimeSlot[] = [];
  let entered = false;
  for (let m = start; m < current + 1440 - SLOT_STEP; m += SLOT_STEP) {
    if (isOpenAtMinute(store, m)) {
      entered = true;
      slots.push({ value: hhmm(m % 1440), tomorrow: m >= 1440 });
    } else if (entered) {
      break; // end of the open session
    }
  }
  return slots;
}

/** Server check: "HH:MM" is a valid upcoming slot (no lead — the customer may have taken a while to fill the form) */
export function isValidSlot(store: StoreHours, value: string, now: Date = new Date()): boolean {
  return timeSlots(store, now, 0).some((s) => s.value === value);
}

/** The scheduled "HH:MM" falls on the day after the order was placed (store time zone) */
export function isNextDaySlot(createdAt: Date, value: string, timeZone: string): boolean {
  const slot = toMinutes(value);
  if (slot === null) return false;
  const { hour, minute } = zonedParts(createdAt, timeZone);
  return slot < hour * 60 + minute;
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
