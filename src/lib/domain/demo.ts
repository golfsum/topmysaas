import { getUtcWeekBounds } from "./week";
import type { LeaderboardSnapshot, PublicListing } from "./types";
import { DEFAULT_BOARD_SETTINGS } from "./types";

const demoProducts: Array<
  Pick<PublicListing, "id" | "name" | "url" | "description" | "bidAmountCents">
> = [
  {
    id: "preview-clientplot",
    name: "ClientPlot.com",
    url: "https://clientplot.com",
    description: "ClientPlot's official product website.",
    bidAmountCents: 600,
  },
  {
    id: "preview-appsresolve",
    name: "AppsResolve.com",
    url: "https://appsresolve.com",
    description: "AI-assisted application support with human review.",
    bidAmountCents: 500,
  },
];

export function getDemoLeaderboard(now = new Date()): LeaderboardSnapshot {
  const { weekId, nextResetAt } = getUtcWeekBounds(now);
  const timestamp = now.toISOString();

  return {
    listings: demoProducts.map((product) => ({
      ...product,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    settings: DEFAULT_BOARD_SETTINGS,
    weekId,
    nextResetAt: nextResetAt.toISOString(),
    generatedAt: timestamp,
    source: "demo",
  };
}
