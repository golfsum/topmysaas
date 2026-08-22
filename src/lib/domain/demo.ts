import { getUtcWeekBounds } from "./week";
import type { LeaderboardSnapshot, PublicListing } from "./types";
import { DEFAULT_BOARD_SETTINGS } from "./types";

const demoProducts: Array<
  Pick<PublicListing, "id" | "name" | "url" | "description" | "bidAmountCents">
> = [
  {
    id: "demo-nexusflow",
    name: "NexusFlow",
    url: "https://nexusflow.example",
    description: "AI workflow automation for modern product teams.",
    bidAmountCents: 24_700,
  },
  {
    id: "demo-flowkit",
    name: "Flowkit",
    url: "https://flowkit.example",
    description: "No-code automation that connects your daily tools.",
    bidAmountCents: 18_900,
  },
  {
    id: "demo-chatlayer",
    name: "ChatLayer",
    url: "https://chatlayer.example",
    description: "Fast customer support for growing software teams.",
    bidAmountCents: 15_600,
  },
  {
    id: "demo-metricly",
    name: "Metricly",
    url: "https://metricly.example",
    description: "Simple product analytics and decision-ready insights.",
    bidAmountCents: 12_800,
  },
  {
    id: "demo-cloudbolt",
    name: "CloudBolt",
    url: "https://cloudbolt.example",
    description: "Cloud operations without the infrastructure overhead.",
    bidAmountCents: 9_700,
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
