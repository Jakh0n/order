// Server va klientda bir xil ishlaydi. Vaqt — Toshkent (UTC+5).

const TIME_ZONE = "Asia/Tashkent";

interface StoreHours {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

function tashkentMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** Do'kon hozir buyurtma qabul qiladimi: isOpen + ish vaqti (tunda yopiladigan holat ham). */
export function isStoreOpenNow(store: StoreHours, now: Date = new Date()): boolean {
  if (!store.isOpen) return false;
  if (!store.openTime || !store.closeTime) return true;

  const open = toMinutes(store.openTime);
  const close = toMinutes(store.closeTime);
  if (open === null || close === null || open === close) return true;

  const current = tashkentMinutes(now);
  return open < close ? current >= open && current < close : current >= open || current < close; // masalan 18:00–02:00
}
