import { describe, expect, it } from "vitest";
import { calculateChargeCents, dollarsToCents } from "./money";
import {
  findRank,
  getTopFive,
  minimumTotalForTargetRank,
  rankListings,
} from "./ranking";
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

  it("inserts a new total at its exact rank and shifts lower listings down", () => {
    const values = [100, 90, 80, 70, 65, 60, 58, 56, 55, 50, 45].map(
      (value, index) => listing(`existing-${index + 1}`, value * 100),
    );
    const ranked = rankListings([...values, listing("new-bid", 5_100)]);

    expect(ranked.slice(8).map(({ id }) => id)).toEqual([
      "existing-9",
      "new-bid",
      "existing-10",
      "existing-11",
    ]);
    expect(findRank(ranked, "new-bid")).toBe(10);
  });

  it("requires one increment above the occupied target rank", () => {
    expect(minimumTotalForTargetRank(5_000, 500, 100)).toBe(5_100);
    expect(minimumTotalForTargetRank(undefined, 500, 100)).toBe(500);
  });

  it("charges only the increase when rank five targets rank one", () => {
    const values = [100, 90, 80, 70, 60].map((value, index) =>
      listing(`rank-${index + 1}`, value * 100),
    );
    const targetTotalCents = 10_100;
    const chargeCents = calculateChargeCents(
      values[4].bidAmountCents,
      targetTotalCents,
    );
    const raisedListing = {
      ...values[4],
      bidAmountCents: values[4].bidAmountCents + chargeCents,
    };

    expect(chargeCents).toBe(4_100);
    expect(findRank([...values.slice(0, 4), raisedListing], "rank-5")).toBe(1);
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
