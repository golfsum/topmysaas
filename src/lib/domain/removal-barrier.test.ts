import { describe, expect, it } from "vitest";

import { removalBarrierAllowsIntent } from "./removal-barrier";

describe("listing removal barrier", () => {
  it("allows a payment when the listing has not been removed", () => {
    expect(removalBarrierAllowsIntent(false, undefined, undefined)).toBe(true);
  });

  it("allows a new checkout that accepted the current removal", () => {
    expect(removalBarrierAllowsIntent(true, "removal-2", "removal-2")).toBe(
      true,
    );
  });

  it("rejects legacy and pre-removal checkouts", () => {
    expect(removalBarrierAllowsIntent(true, undefined, undefined)).toBe(false);
    expect(removalBarrierAllowsIntent(true, "removal-2", undefined)).toBe(
      false,
    );
    expect(
      removalBarrierAllowsIntent(true, "removal-2", "removal-1"),
    ).toBe(false);
  });

  it("invalidates an accepted checkout when the listing is removed again", () => {
    expect(
      removalBarrierAllowsIntent(true, "removal-3", "removal-2"),
    ).toBe(false);
  });
});
