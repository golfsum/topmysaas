import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PublicListing } from "@/lib/domain/types";
import { DEFAULT_BOARD_SETTINGS } from "@/lib/domain/types";

import { LowerRankings } from "./lower-rankings";

function listing(rank: number, bidAmountCents: number): PublicListing {
  return {
    id: `rank-${rank}`,
    name: `Rank ${rank} SaaS`,
    url: `https://rank-${rank}.example`,
    description: `Product currently ranked number ${rank}.`,
    bidAmountCents,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
  };
}

describe("lower rankings", () => {
  it("keeps ranks below the Top 5 visible and biddable", () => {
    const html = renderToStaticMarkup(
      <LowerRankings
        rankedListings={[
          { listing: listing(6, 7_000), rank: 6 },
          { listing: listing(7, 6_500), rank: 7 },
          { listing: listing(8, 6_000), rank: 8 },
          { listing: listing(9, 5_500), rank: 9 },
          { listing: listing(10, 5_000), rank: 10 },
        ]}
        settings={DEFAULT_BOARD_SETTINGS}
        biddingEnabled
        disabledBidLabel="Bidding unavailable"
        trackClicks
        onBid={() => undefined}
      />,
    );

    expect(html).toContain("#10");
    expect(html).toContain("Rank 10 SaaS");
    expect(html).toContain("Claim this spot for $51");
    expect(html).toContain('href="/go/rank-10"');
    expect(html).toContain("listing-row-link");
    expect(html).not.toContain("/api/favicon");
    expect(html).not.toContain('href="https://rank-10.example/"');
  });

  it("keeps explicit global rank numbers on later or filtered pages", () => {
    const html = renderToStaticMarkup(
      <LowerRankings
        rankedListings={[
          { listing: listing(51, 4_900), rank: 51 },
          { listing: listing(137, 4_800), rank: 137 },
        ]}
        settings={DEFAULT_BOARD_SETTINGS}
        biddingEnabled
        disabledBidLabel="Bidding unavailable"
        trackClicks
        onBid={() => undefined}
        rangeLabel="Matches 1–2"
      />,
    );

    expect(html).toContain("Matches 1–2");
    expect(html).toContain("#51");
    expect(html).toContain("#137");
    expect(html).toContain("Claim this spot for $49");
  });
});
