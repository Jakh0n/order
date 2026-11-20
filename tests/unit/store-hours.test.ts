import { describe, expect, it } from "vitest";

import {
  isNextDaySlot,
  isStoreOpenNow,
  isValidSlot,
  isValidTimeZone,
  opensAt,
  startOfDayInZone,
  timeSlots,
} from "@/lib/store-hours";

const TASHKENT = "Asia/Tashkent"; // UTC+5, no DST
/** Wall-clock time in Tashkent → Date */
const tashkent = (hhmm: string, day = "2026-11-20") => new Date(`${day}T${hhmm}:00+05:00`);

const day = { isOpen: true, openTime: "09:00", closeTime: "22:00", timeZone: TASHKENT };
const night = { isOpen: true, openTime: "18:00", closeTime: "02:00", timeZone: TASHKENT };

describe("isStoreOpenNow", () => {
  it("uses the store's time zone, not the server's", () => {
    // 05:00 UTC = 10:00 Tashkent → open; 18:00 UTC = 23:00 → closed
    expect(isStoreOpenNow(day, new Date("2026-11-20T05:00:00Z"))).toBe(true);
    expect(isStoreOpenNow(day, new Date("2026-11-20T18:00:00Z"))).toBe(false);
  });
  it("open is inclusive, close is exclusive", () => {
    expect(isStoreOpenNow(day, tashkent("08:59"))).toBe(false);
    expect(isStoreOpenNow(day, tashkent("09:00"))).toBe(true);
    expect(isStoreOpenNow(day, tashkent("21:59"))).toBe(true);
    expect(isStoreOpenNow(day, tashkent("22:00"))).toBe(false);
  });
  it("overnight hours (18:00–02:00)", () => {
    expect(isStoreOpenNow(night, tashkent("17:59"))).toBe(false);
    expect(isStoreOpenNow(night, tashkent("23:30"))).toBe(true);
    expect(isStoreOpenNow(night, tashkent("01:59"))).toBe(true);
    expect(isStoreOpenNow(night, tashkent("02:00"))).toBe(false);
  });
  it("manually closed store is closed", () => {
    expect(isStoreOpenNow({ ...day, isOpen: false }, tashkent("12:00"))).toBe(false);
  });
  it("no hours, equal hours or broken hours → always open", () => {
    expect(isStoreOpenNow({ ...day, openTime: null, closeTime: null }, tashkent("03:00"))).toBe(
      true,
    );
    expect(isStoreOpenNow({ ...day, openTime: "10:00", closeTime: "10:00" }, tashkent("03:00"))).toBe(
      true,
    );
    expect(isStoreOpenNow({ ...day, openTime: "nope" }, tashkent("03:00"))).toBe(true);
  });
  it("an invalid time zone falls back to UTC", () => {
    const store = { ...day, timeZone: "Mars/Olympus" };
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isStoreOpenNow(store, new Date("2026-11-20T10:00:00Z"))).toBe(true);
    expect(isStoreOpenNow(store, new Date("2026-11-20T23:00:00Z"))).toBe(false);
  });
});

describe("opensAt", () => {
  it("opening time only when closed by the hours", () => {
    expect(opensAt(day, tashkent("07:00"))).toBe("09:00");
    expect(opensAt(day, tashkent("12:00"))).toBeNull();
    expect(opensAt({ ...day, isOpen: false }, tashkent("07:00"))).toBeNull();
  });
});

describe("timeSlots", () => {
  it("starts at now + 30 min on a 15-minute grid", () => {
    const slots = timeSlots(day, tashkent("12:07"));
    expect(slots[0]).toEqual({ value: "12:45", tomorrow: false });
    expect(slots.every((s) => Number(s.value.slice(3)) % 15 === 0)).toBe(true);
  });
  it("ends at closing time", () => {
    const slots = timeSlots(day, tashkent("20:00"));
    expect(slots.at(-1)).toEqual({ value: "21:45", tomorrow: false });
  });
  it("closed now → slots from tomorrow's opening (pre-order)", () => {
    const slots = timeSlots(day, tashkent("23:00"));
    expect(slots[0]).toEqual({ value: "09:00", tomorrow: true });
    expect(slots.at(-1)).toEqual({ value: "21:45", tomorrow: true });
  });
  it("overnight session crosses midnight", () => {
    const values = timeSlots(night, tashkent("23:00")).map((s) => s.value);
    expect(values[0]).toBe("23:30");
    expect(values.at(-1)).toBe("01:45");
    expect(values).toContain("00:00");
  });
  it("no slots when manually closed", () => {
    expect(timeSlots({ ...day, isOpen: false }, tashkent("12:00"))).toEqual([]);
  });
});

describe("isValidSlot / isNextDaySlot", () => {
  it("server accepts upcoming slots without the lead, rejects others", () => {
    const now = tashkent("12:07");
    expect(isValidSlot(day, "12:15", now)).toBe(true);
    expect(isValidSlot(day, "12:10", now)).toBe(false); // off the grid
    expect(isValidSlot(day, "23:00", now)).toBe(false); // closed
    expect(isValidSlot(day, "garbage", now)).toBe(false);
  });
  it("a slot earlier than the order time is tomorrow", () => {
    expect(isNextDaySlot(tashkent("23:00"), "09:00", TASHKENT)).toBe(true);
    expect(isNextDaySlot(tashkent("10:00"), "12:00", TASHKENT)).toBe(false);
  });
});

describe("startOfDayInZone", () => {
  it("midnight in the store's zone, as UTC", () => {
    // 02:00 on Nov 21 in Tashkent is still Nov 20 21:00 UTC
    expect(startOfDayInZone(TASHKENT, new Date("2026-11-20T21:00:00Z")).toISOString()).toBe(
      "2026-11-20T19:00:00.000Z",
    );
    expect(startOfDayInZone("UTC", new Date("2026-11-20T21:00:00Z")).toISOString()).toBe(
      "2026-11-20T00:00:00.000Z",
    );
  });
  it("handles a DST zone", () => {
    // New York in summer is UTC−4
    expect(
      startOfDayInZone("America/New_York", new Date("2026-07-01T15:00:00Z")).toISOString(),
    ).toBe("2026-07-01T04:00:00.000Z");
  });
});
