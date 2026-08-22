import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LeaderboardPagination } from "./leaderboard-pagination";

describe("leaderboard pagination controls", () => {
  it("links rank pages without prefetching extra leaderboard requests", () => {
    const html = renderToStaticMarkup(
      <LeaderboardPagination
        currentPage={2}
        totalPages={3}
        totalListings={123}
        startRank={51}
        endRank={100}
      />,
    );

    expect(html).toContain("Showing ranks");
    expect(html).toContain("#51–#100");
    expect(html).toContain('href="/#leaderboard"');
    expect(html).toContain('href="/?page=3#leaderboard"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('href="/?page=2#leaderboard"');
  });

  it("stays hidden when every listing fits on one page", () => {
    expect(
      renderToStaticMarkup(
        <LeaderboardPagination
          currentPage={1}
          totalPages={1}
          totalListings={50}
          startRank={1}
          endRank={50}
        />,
      ),
    ).toBe("");
  });
});
