import { describe, expect, it } from "vitest";
import {
  getPreviousWeekId,
  getUtcWeekBounds,
  isCheckoutWindowOpen,
} from "./week";

describe("UTC board weeks", () => {
  it("starts on Monday at 00:00 UTC", () => {
    const bounds = getUtcWeekBounds(new Date("2026-08-21T18:15:00.000Z"));
    expect(bounds.weekId).toBe("2026-08-17");
    expect(bounds.startsAt.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    expect(bounds.nextResetAt.toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("keeps Sunday inside the current week", () => {
    expect(
      getUtcWeekBounds(new Date("2026-08-23T23:59:59.999Z")).weekId,
    ).toBe("2026-08-17");
  });

  it("moves to a new week exactly at reset", () => {
    expect(
      getUtcWeekBounds(new Date("2026-08-24T00:00:00.000Z")).weekId,
    ).toBe("2026-08-24");
    expect(getPreviousWeekId(new Date("2026-08-24T00:00:00.000Z"))).toBe(
      "2026-08-17",
    );
  });

  it("closes checkout inside the configured reset window", () => {
    expect(
      isCheckoutWindowOpen(new Date("2026-08-23T23:29:59.000Z"), 30),
    ).toBe(true);
    expect(
      isCheckoutWindowOpen(new Date("2026-08-23T23:30:00.000Z"), 30),
    ).toBe(false);
  });
});
