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
        listings={[
          listing(6, 7_000),
          listing(7, 6_500),
          listing(8, 6_000),
          listing(9, 5_500),
          listing(10, 5_000),
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
    expect(html).toContain("Bid for #10 from $51");
    expect(html).toContain('href="/go/rank-10"');
    expect(html).not.toContain('href="https://rank-10.example/"');
  });
});
