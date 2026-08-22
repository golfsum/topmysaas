import { describe, expect, it } from "vitest";

import {
  INITIAL_LAUNCH_AT,
  isBeforeInitialLaunch,
  isInitialExtendedBoardPeriod,
  isLaunchPageEnabled,
  resolveInitialLaunchAt,
} from "./launch";

describe("initial public launch", () => {
  it("uses the next Monday reset as the fixed launch boundary", () => {
    expect(INITIAL_LAUNCH_AT).toBe("2026-08-24T00:00:00.000Z");
    expect(
      isBeforeInitialLaunch(new Date("2026-08-23T23:59:59.999Z")),
    ).toBe(true);
    expect(isBeforeInitialLaunch(new Date(INITIAL_LAUNCH_AT))).toBe(false);
  });

  it("keeps the launch page enabled unless it is explicitly forced off", () => {
    expect(isLaunchPageEnabled(undefined)).toBe(true);
    expect(isLaunchPageEnabled("true")).toBe(true);
    expect(isLaunchPageEnabled("false")).toBe(false);
  });

  it("accepts a valid test override and rejects an invalid one", () => {
    expect(resolveInitialLaunchAt("2099-01-01T00:00:00Z")).toBe(
      "2099-01-01T00:00:00.000Z",
    );
    expect(resolveInitialLaunchAt("not-a-date")).toBe(INITIAL_LAUNCH_AT);
  });

  it("defines one extended board period through the first live week", () => {
    expect(
      isInitialExtendedBoardPeriod(
        new Date("2026-08-17T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(isInitialExtendedBoardPeriod(new Date(INITIAL_LAUNCH_AT))).toBe(
      true,
    );
    expect(
      isInitialExtendedBoardPeriod(
        new Date("2026-08-31T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
