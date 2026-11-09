// Buyurtma holati o'tishlari — klient (tugmalar) va server (tekshiruv) uchun bitta manba.

export type OrderStatusValue =
  "NEW" | "ACCEPTED" | "READY" | "ON_THE_WAY" | "COMPLETED" | "CANCELLED";

export type OrderTypeValue = "PICKUP" | "DELIVERY";

export const ACTIVE_STATUSES: OrderStatusValue[] = ["NEW", "ACCEPTED", "READY", "ON_THE_WAY"];

/** NEW for longer than this → the customer probably didn't send the Telegram/WhatsApp message */
const STALE_NEW_MS = 5 * 60_000;

/** Ids of orders still NEW after 5 minutes (admin hint "call or message the customer") */
export function staleNewOrderIds(
  orders: { id: string; status: OrderStatusValue; createdAt: Date }[],
  now: Date = new Date(),
): Set<string> {
  return new Set(
    orders
      .filter((o) => o.status === "NEW" && now.getTime() - o.createdAt.getTime() > STALE_NEW_MS)
      .map((o) => o.id),
  );
}

export function isFinalStatus(status: OrderStatusValue) {
  return status === "COMPLETED" || status === "CANCELLED";
}

/** Asosiy "keyingi qadam" tugmasi */
export function nextStatus(
  status: OrderStatusValue,
  type: OrderTypeValue,
): OrderStatusValue | null {
  switch (status) {
    case "NEW":
      return "ACCEPTED";
    case "ACCEPTED":
      return "READY";
    case "READY":
      return type === "DELIVERY" ? "ON_THE_WAY" : "COMPLETED";
    case "ON_THE_WAY":
      return "COMPLETED";
    default:
      return null;
  }
}

function flowFor(type: OrderTypeValue): OrderStatusValue[] {
  return type === "DELIVERY"
    ? ["NEW", "ACCEPTED", "READY", "ON_THE_WAY", "COMPLETED"]
    : ["NEW", "ACCEPTED", "READY", "COMPLETED"];
}

/**
 * "Undo" after a mistaken tap: back to an earlier step of the flow.
 * Cancelled orders are not revived this way (cancel has its own confirmation).
 */
export function canRevert(
  from: OrderStatusValue,
  to: OrderStatusValue,
  type: OrderTypeValue,
): boolean {
  const flow = flowFor(type);
  const i = flow.indexOf(from);
  const j = flow.indexOf(to);
  return i !== -1 && j !== -1 && j < i;
}

export function canTransition(
  from: OrderStatusValue,
  to: OrderStatusValue,
  type: OrderTypeValue,
): boolean {
  if (isFinalStatus(from) || from === to) return false;
  if (to === "CANCELLED") return true;
  // Bitta qadamni o'tkazib yuborish mumkin (masalan, NEW -> READY), orqaga qaytish yo'q
  const flow = flowFor(type);
  const i = flow.indexOf(from);
  const j = flow.indexOf(to);
  return i !== -1 && j > i;
}
