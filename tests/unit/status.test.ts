import { describe, expect, it } from "vitest";

import {
  canRevert,
  canTransition,
  isFinalStatus,
  nextStatus,
  staleNewOrderIds,
} from "@/lib/orders/status";

describe("nextStatus", () => {
  it("delivery goes through ON_THE_WAY", () => {
    expect(nextStatus("NEW", "DELIVERY")).toBe("ACCEPTED");
    expect(nextStatus("ACCEPTED", "DELIVERY")).toBe("READY");
    expect(nextStatus("READY", "DELIVERY")).toBe("ON_THE_WAY");
    expect(nextStatus("ON_THE_WAY", "DELIVERY")).toBe("COMPLETED");
  });
  it("pickup and dine-in finish after READY", () => {
    expect(nextStatus("READY", "PICKUP")).toBe("COMPLETED");
    expect(nextStatus("READY", "DINE_IN")).toBe("COMPLETED");
  });
  it("nothing after a final status", () => {
    expect(nextStatus("COMPLETED", "PICKUP")).toBeNull();
    expect(nextStatus("CANCELLED", "DELIVERY")).toBeNull();
  });
});

describe("canTransition", () => {
  it("forward, skipping steps allowed", () => {
    expect(canTransition("NEW", "READY", "PICKUP")).toBe(true);
    expect(canTransition("NEW", "COMPLETED", "DELIVERY")).toBe(true);
  });
  it("no going back, no same status", () => {
    expect(canTransition("READY", "ACCEPTED", "PICKUP")).toBe(false);
    expect(canTransition("NEW", "NEW", "PICKUP")).toBe(false);
  });
  it("ON_THE_WAY only for delivery", () => {
    expect(canTransition("READY", "ON_THE_WAY", "PICKUP")).toBe(false);
    expect(canTransition("READY", "ON_THE_WAY", "DELIVERY")).toBe(true);
  });
  it("cancel from any active status, never from a final one", () => {
    expect(canTransition("ON_THE_WAY", "CANCELLED", "DELIVERY")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED", "PICKUP")).toBe(false);
    expect(canTransition("CANCELLED", "NEW", "PICKUP")).toBe(false);
  });
});

describe("canRevert", () => {
  it("back to an earlier step of the same flow", () => {
    expect(canRevert("READY", "ACCEPTED", "PICKUP")).toBe(true);
    expect(canRevert("COMPLETED", "ON_THE_WAY", "DELIVERY")).toBe(true);
  });
  it("not forward, not out of CANCELLED, not into a step the flow lacks", () => {
    expect(canRevert("ACCEPTED", "READY", "PICKUP")).toBe(false);
    expect(canRevert("CANCELLED", "NEW", "PICKUP")).toBe(false);
    expect(canRevert("COMPLETED", "ON_THE_WAY", "PICKUP")).toBe(false);
  });
});

describe("isFinalStatus / staleNewOrderIds", () => {
  it("final statuses", () => {
    expect(isFinalStatus("COMPLETED")).toBe(true);
    expect(isFinalStatus("CANCELLED")).toBe(true);
    expect(isFinalStatus("READY")).toBe(false);
  });
  it("NEW for more than 5 minutes is stale", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const ago = (min: number) => new Date(now.getTime() - min * 60_000);
    const ids = staleNewOrderIds(
      [
        { id: "a", status: "NEW", createdAt: ago(6) },
        { id: "b", status: "NEW", createdAt: ago(5) },
        { id: "c", status: "ACCEPTED", createdAt: ago(60) },
      ],
      now,
    );
    expect([...ids]).toEqual(["a"]);
  });
});
