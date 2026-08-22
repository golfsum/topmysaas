import { describe, expect, it } from "vitest";
import {
  getPreviousWeekId,
  getUtcWeekBounds,
  isCheckoutWindowOpen,
} from "./week";

describe("UTC board weeks", () => {
  it("extends the pre-launch board through the first live week", () => {
    const bounds = getUtcWeekBounds(new Date("2026-08-21T18:15:00.000Z"));
    expect(bounds.weekId).toBe("2026-08-17");
    expect(bounds.startsAt.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    expect(bounds.nextResetAt.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("keeps the same board immediately before and after launch", () => {
    expect(
      getUtcWeekBounds(new Date("2026-08-23T23:59:59.999Z")).weekId,
    ).toBe("2026-08-17");
    const launched = getUtcWeekBounds(new Date("2026-08-24T00:00:00.000Z"));
    expect(launched.weekId).toBe("2026-08-17");
    expect(launched.nextResetAt.toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("starts normal weekly boards at the first clearing reset", () => {
    expect(
      getUtcWeekBounds(new Date("2026-08-31T00:00:00.000Z")).weekId,
    ).toBe("2026-08-31");
    expect(getPreviousWeekId(new Date("2026-08-31T00:00:00.000Z"))).toBe(
      "2026-08-17",
    );
    expect(getPreviousWeekId(new Date("2026-09-07T00:00:00.000Z"))).toBe(
      "2026-08-31",
    );
  });

  it("keeps daily reset recovery checks pointed at the prior board", () => {
    expect(getPreviousWeekId(new Date("2026-09-01T00:10:00.000Z"))).toBe(
      "2026-08-17",
    );
    expect(getPreviousWeekId(new Date("2026-09-08T00:10:00.000Z"))).toBe(
      "2026-08-31",
    );
  });

  it("keeps checkout open through launch and closes before August 31", () => {
    expect(
      isCheckoutWindowOpen(new Date("2026-08-23T23:29:59.000Z"), 30),
    ).toBe(true);
    expect(
      isCheckoutWindowOpen(new Date("2026-08-24T00:00:00.000Z"), 30),
    ).toBe(true);
    expect(
      isCheckoutWindowOpen(new Date("2026-08-30T23:30:00.000Z"), 30),
    ).toBe(false);
  });
});
