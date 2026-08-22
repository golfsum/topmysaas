import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  LaunchCountdown,
  calculateLaunchTimeLeft,
} from "./launch-countdown";

describe("launch countdown", () => {
  it("calculates the time remaining until the fixed UTC launch", () => {
    expect(
      calculateLaunchTimeLeft(
        "2026-08-24T00:00:00.000Z",
        Date.parse("2026-08-22T21:58:57.000Z"),
      ),
    ).toMatchObject({ days: 1, hours: 2, minutes: 1, seconds: 3 });
  });

  it("clamps at zero and renders the exact accessible launch time", () => {
    expect(
      calculateLaunchTimeLeft(
        "2026-08-24T00:00:00.000Z",
        Date.parse("2026-08-24T00:00:01.000Z"),
      )?.totalMilliseconds,
    ).toBe(0);

    const html = renderToStaticMarkup(
      <LaunchCountdown
        launchAt="2026-08-24T00:00:00.000Z"
        serverNow="2026-08-22T00:00:00.000Z"
      />,
    );
    expect(html).toContain("Leaderboard goes live in");
    expect(html).toContain("Monday, Aug 24 at 00:00 UTC");
    expect(html).toContain(
      "All paid pre-launch listings and totals carry into the opening board.",
    );
  });
});
