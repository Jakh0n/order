// Country calling code from a full international number, to pre-fill the customer's phone field.
// Calling codes are prefix-free: +1 and +7 are one digit; the two-digit codes are listed below;
// everything else is three digits (e.g. +998, +971).

const TWO_DIGIT = new Set([
  "20",
  "27",
  "30",
  "31",
  "32",
  "33",
  "34",
  "36",
  "39",
  "40",
  "41",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "57",
  "58",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "81",
  "82",
  "84",
  "86",
  "90",
  "91",
  "92",
  "93",
  "94",
  "95",
  "98",
]);

/** "+998 90 123 45 67" → "+998 "; unknown / empty → "+" */
export function dialPrefix(phone: string | null | undefined): string {
  const digits = (phone ?? "")
    .trim()
    .replace(/^00/, "+")
    .replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) return "+";
  const d = digits.slice(1);
  if (d.length < 4) return "+";
  if (d[0] === "1" || d[0] === "7") return `+${d[0]} `;
  if (TWO_DIGIT.has(d.slice(0, 2))) return `+${d.slice(0, 2)} `;
  return `+${d.slice(0, 3)} `;
}
