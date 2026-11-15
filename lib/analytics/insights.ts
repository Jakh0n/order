import type { Analytics } from "@/lib/analytics/data";

// Plain-language tips from the numbers already on the analytics page. Rule-based (no AI):
// each rule needs enough orders to mean something, otherwise it stays silent.

export type Insight =
  | { kind: "busiest"; weekday: number; hour: number; orders: number }
  | { kind: "rising"; name: string; cur: number; prev: number }
  | { kind: "falling"; name: string; cur: number; prev: number }
  | { kind: "lapsed"; count: number };

const MIN_ORDERS_FOR_PEAK = 10;
const MIN_ITEM_QTY = 3;

export function buildInsights(data: Analytics): Insight[] {
  const out: Insight[] = [];

  // Busiest 2-hour block of the week
  if (data.current.orders >= MIN_ORDERS_FOR_PEAK) {
    let best = { weekday: 0, hour: 0, orders: 0 };
    data.byWeekdayHour.forEach((row, weekday) => {
      for (let h = 0; h < 24; h += 2) {
        const orders = row[h] + row[h + 1];
        if (orders > best.orders) best = { weekday, hour: h, orders };
      }
    });
    if (best.orders > 1) out.push({ kind: "busiest", ...best });
  }

  // Dishes moving most vs the previous period (only when there is a previous period to compare)
  if (data.previous.orders > 0) {
    const rising = data.itemMoves
      .filter((m) => m.cur >= MIN_ITEM_QTY && m.cur >= m.prev * 1.3 && m.cur > m.prev)
      .sort((a, b) => b.cur - b.prev - (a.cur - a.prev))[0];
    const falling = data.itemMoves
      .filter((m) => m.prev >= MIN_ITEM_QTY && m.cur <= m.prev * 0.7)
      .sort((a, b) => b.prev - b.cur - (a.prev - a.cur))[0];
    if (rising) out.push({ kind: "rising", ...rising });
    if (falling) out.push({ kind: "falling", ...falling });
  }

  if (data.lapsedRegulars > 0) out.push({ kind: "lapsed", count: data.lapsedRegulars });

  return out;
}
