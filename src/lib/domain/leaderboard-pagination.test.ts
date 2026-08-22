import { describe, expect, it } from "vitest";

import {
  LEADERBOARD_PAGE_SIZE,
  paginateLeaderboard,
  parseLeaderboardPage,
} from "./leaderboard-pagination";

describe("leaderboard pagination", () => {
  it("shows global ranks 1 through 50 on the first page", () => {
    const listings = Array.from({ length: 123 }, (_, index) => index + 1);
    const page = paginateLeaderboard(listings, 1);

    expect(LEADERBOARD_PAGE_SIZE).toBe(50);
    expect(page).toMatchObject({
      currentPage: 1,
      totalPages: 3,
      totalListings: 123,
      startRank: 1,
      endRank: 50,
    });
    expect(page.listings).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
  });

  it("continues in order with 50 listings per page", () => {
    const listings = Array.from({ length: 123 }, (_, index) => index + 1);
    const secondPage = paginateLeaderboard(listings, 2);
    const thirdPage = paginateLeaderboard(listings, 3);

    expect(secondPage.startRank).toBe(51);
    expect(secondPage.endRank).toBe(100);
    expect(secondPage.listings).toHaveLength(50);
    expect(secondPage.listings[0]).toBe(51);
    expect(secondPage.listings.at(-1)).toBe(100);
    expect(thirdPage.startRank).toBe(101);
    expect(thirdPage.endRank).toBe(123);
    expect(thirdPage.listings).toEqual(
      Array.from({ length: 23 }, (_, index) => index + 101),
    );
  });

  it("handles exact boundaries, empty boards, and oversized pages", () => {
    expect(paginateLeaderboard(Array.from({ length: 50 }), 1).totalPages).toBe(1);
    expect(paginateLeaderboard(Array.from({ length: 100 }), 2).endRank).toBe(100);
    expect(paginateLeaderboard([], 4)).toMatchObject({
      currentPage: 1,
      totalPages: 1,
      startRank: 0,
      endRank: 0,
      listings: [],
    });
    expect(paginateLeaderboard(Array.from({ length: 51 }), 99).currentPage).toBe(2);
  });

  it("accepts only a single positive safe integer query value", () => {
    expect(parseLeaderboardPage("2")).toBe(2);
    for (const value of [
      undefined,
      ["2", "3"],
      "0",
      "-1",
      "1.5",
      "page",
      "9007199254740992",
    ]) {
      expect(parseLeaderboardPage(value)).toBe(1);
    }
  });
});
