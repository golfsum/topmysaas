import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LeaderboardSnapshot, PublicListing } from "@/lib/domain/types";
import { DEFAULT_BOARD_SETTINGS } from "@/lib/domain/types";

import { LaunchSoonHome } from "./launch-soon-home";
import { PublicHome } from "./public-home";

function listing(rank: number): PublicListing {
  const label = String(rank).padStart(3, "0");
  return {
    id: `listing-${label}`,
    name: `SaaS Rank ${label}`,
    url: `https://rank-${rank}.example`,
    description: `The product at global rank ${rank}.`,
    bidAmountCents: 20_000 - rank,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  };
}

const snapshot: LeaderboardSnapshot = {
  listings: Array.from({ length: 101 }, (_, index) => listing(index + 1)),
  settings: DEFAULT_BOARD_SETTINGS,
  weekId: "2026-08-17",
  nextResetAt: "2026-08-24T00:00:00.000Z",
  generatedAt: "2026-08-22T12:00:00.000Z",
  source: "firestore",
};

describe("public leaderboard page ranges", () => {
  it("renders ranks 1 through 50 on launch page one", () => {
    const html = renderToStaticMarkup(
      <LaunchSoonHome initialSnapshot={snapshot} requestedPage={1} />,
    );

    expect(html).toContain("Ranks #6–#50");
    expect(html).toContain("SaaS Rank 050");
    expect(html).not.toContain("SaaS Rank 051");
    expect(html).toContain('href="/?page=2#leaderboard"');
  });

  it("renders ranks 51 through 100 on launch page two", () => {
    const html = renderToStaticMarkup(
      <LaunchSoonHome initialSnapshot={snapshot} requestedPage={2} />,
    );

    expect(html).toContain("Ranks #51–#100");
    expect(html).toContain("SaaS Rank 051");
    expect(html).toContain("SaaS Rank 100");
    expect(html).not.toContain("SaaS Rank 050");
    expect(html).not.toContain("SaaS Rank 002");
  });

  it("uses the same global range on the full leaderboard", () => {
    const html = renderToStaticMarkup(
      <PublicHome initialSnapshot={snapshot} requestedPage={2} />,
    );

    expect(html).toContain("Rankings #51–#100");
    expect(html).toContain("SaaS Rank 051");
    expect(html).toContain("SaaS Rank 100");
    expect(html).not.toContain("SaaS Rank 050");
  });
});
