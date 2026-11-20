// The example chat in the landing's problem story (shared by the animated and the static version).

/**
 * When each chat message was sent (the example chat, not a statistic). Same length as
 * home.problem.messages: customer first, then the owner, alternating.
 */
export const CHAT_TIMES = ["19:02", "19:04", "19:07", "19:09", "19:12", "19:15", "19:18", "19:21"];

/** What an order needs, and the message (index) after which the owner knows it. null = never in this chat. */
export const ORDER_FACTS = [
  { key: "item", doneAt: 2 },
  { key: "quantity", doneAt: 4 },
  { key: "address", doneAt: 6 },
  { key: "payment", doneAt: null },
] as const;

export function minutesBetween(from: string, to: string): number {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return m(to) - m(from);
}
