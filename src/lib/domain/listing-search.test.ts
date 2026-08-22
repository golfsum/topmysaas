import { describe, expect, it } from "vitest";

import type { PublicListing } from "./types";
import {
  createRankedListings,
  parseListingSearchQuery,
  searchRankedListings,
} from "./listing-search";

function listing(
  id: string,
  name: string,
  url: string,
  description: string,
): PublicListing {
  return {
    id,
    name,
    url,
    description,
    bidAmountCents: 500,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
  };
}

const listings = [
  listing(
    "clientplot",
    "ClientPlot.com",
    "https://clientplot.com",
    "Client reporting for agencies.",
  ),
  listing(
    "appsresolve",
    "AppsResolve.com",
    "https://appsresolve.com",
    "Resolve software choices with clear comparisons.",
  ),
  listing(
    "metric-lab",
    "Métric Lab",
    "https://metrics.example",
    "Revenue analytics for SaaS teams.",
  ),
];

describe("listing search", () => {
  it("preserves true global ranks before filtering", () => {
    expect(createRankedListings(listings).map(({ listing, rank }) => [listing.id, rank])).toEqual([
      ["clientplot", 1],
      ["appsresolve", 2],
      ["metric-lab", 3],
    ]);
    expect(searchRankedListings(listings, "appsresolve")[0]).toMatchObject({
      rank: 2,
      listing: { id: "appsresolve" },
    });
  });

  it("matches names, domains, and descriptions without case sensitivity", () => {
    expect(searchRankedListings(listings, "CLIENT PLOT").map(({ listing }) => listing.id)).toEqual([
      "clientplot",
    ]);
    expect(searchRankedListings(listings, "appsresolve.com").map(({ listing }) => listing.id)).toEqual([
      "appsresolve",
    ]);
    expect(searchRankedListings(listings, "revenue analytics").map(({ listing }) => listing.id)).toEqual([
      "metric-lab",
    ]);
    expect(searchRankedListings(listings, "metric").map(({ listing }) => listing.id)).toEqual([
      "metric-lab",
    ]);
  });

  it("normalizes and limits URL query input", () => {
    expect(parseListingSearchQuery("  Client   Plot  ")).toBe("Client Plot");
    expect(parseListingSearchQuery(["one", "two"])).toBe("");
    expect(parseListingSearchQuery("x".repeat(100))).toHaveLength(80);
  });
});
