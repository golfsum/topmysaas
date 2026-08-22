import { describe, expect, it } from "vitest";
import { calculateChargeCents, dollarsToCents } from "./money";
import { findRank, getTopFive, rankListings } from "./ranking";
import type { PublicListing } from "./types";

function listing(
  id: string,
  bidAmountCents: number,
  createdAt = "2026-08-21T00:00:00.000Z",
): PublicListing {
  return {
    id,
    name: id,
    url: `https://${id}.example`,
    description: "A sufficiently descriptive SaaS product.",
    bidAmountCents,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("ranking", () => {
  it("orders paid totals descending and applies a stable tie break", () => {
    const ranked = rankListings([
      listing("later", 10_000, "2026-08-21T02:00:00.000Z"),
      listing("lower", 9_000),
      listing("earlier", 10_000, "2026-08-21T01:00:00.000Z"),
    ]);
    expect(ranked.map(({ id }) => id)).toEqual(["earlier", "later", "lower"]);
  });

  it("highlights only the top five", () => {
    const values = [1, 2, 3, 4, 5, 6].map((value) =>
      listing(String(value), value * 100),
    );
    expect(getTopFive(values).map(({ id }) => id)).toEqual([
      "6",
      "5",
      "4",
      "3",
      "2",
    ]);
    expect(findRank(values, "1")).toBe(6);
  });
});

describe("bid money", () => {
  it("charges only the difference for an owned listing", () => {
    expect(calculateChargeCents(10_000, 12_500)).toBe(2_500);
  });

  it("turns display dollars into integer cents", () => {
    expect(dollarsToCents("247.25")).toBe(24_725);
    expect(dollarsToCents("not money")).toBeNull();
  });
});
