export const LEADERBOARD_PAGE_SIZE = 50;

export type LeaderboardPage<T> = {
  currentPage: number;
  totalPages: number;
  totalListings: number;
  startRank: number;
  endRank: number;
  listings: T[];
};

export function parseLeaderboardPage(
  value: string | string[] | undefined,
): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export function paginateLeaderboard<T>(
  listings: T[],
  requestedPage: number,
): LeaderboardPage<T> {
  const totalListings = listings.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalListings / LEADERBOARD_PAGE_SIZE),
  );
  const validRequestedPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const currentPage = Math.min(validRequestedPage, totalPages);
  const startIndex = (currentPage - 1) * LEADERBOARD_PAGE_SIZE;
  const endIndex = Math.min(
    startIndex + LEADERBOARD_PAGE_SIZE,
    totalListings,
  );

  return {
    currentPage,
    totalPages,
    totalListings,
    startRank: totalListings === 0 ? 0 : startIndex + 1,
    endRank: endIndex,
    listings: listings.slice(startIndex, endIndex),
  };
}
