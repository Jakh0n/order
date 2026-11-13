// CSV for Excel / Google Sheets: UTF-8 with BOM (Excel shows Cyrillic and Korean correctly),
// RFC 4180 quoting, and formula-injection guard (a cell starting with = + - @ is not run as a formula).

type Cell = string | number | null | undefined;

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  // "-5" from a customer's comment must stay text, but real numbers above are left alone
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(cell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** "2026-11-13 14:05" in the store's time zone (sortable in spreadsheets) */
export function csvDateTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** Today in the store's time zone, for file names */
export function csvToday(timeZone: string): string {
  return csvDateTime(new Date(), timeZone).slice(0, 10);
}
