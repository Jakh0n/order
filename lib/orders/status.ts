// Buyurtma holati o'tishlari — klient (tugmalar) va server (tekshiruv) uchun bitta manba.

export type OrderStatusValue =
  "NEW" | "ACCEPTED" | "READY" | "ON_THE_WAY" | "COMPLETED" | "CANCELLED";

export type OrderTypeValue = "PICKUP" | "DELIVERY";

export const ACTIVE_STATUSES: OrderStatusValue[] = ["NEW", "ACCEPTED", "READY", "ON_THE_WAY"];

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

export function canTransition(
  from: OrderStatusValue,
  to: OrderStatusValue,
  type: OrderTypeValue,
): boolean {
  if (isFinalStatus(from) || from === to) return false;
  if (to === "CANCELLED") return true;
  // Bitta qadamni o'tkazib yuborish mumkin (masalan, NEW -> READY), orqaga qaytish yo'q
  const flow: OrderStatusValue[] =
    type === "DELIVERY"
      ? ["NEW", "ACCEPTED", "READY", "ON_THE_WAY", "COMPLETED"]
      : ["NEW", "ACCEPTED", "READY", "COMPLETED"];
  const i = flow.indexOf(from);
  const j = flow.indexOf(to);
  return i !== -1 && j > i;
}
