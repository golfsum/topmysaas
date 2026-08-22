import type { PublicListing } from "./types";

export const MAX_LISTING_SEARCH_LENGTH = 80;

export type RankedListing<T extends PublicListing = PublicListing> = {
  listing: T;
  rank: number;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseListingSearchQuery(
  value: string | string[] | undefined,
): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_LISTING_SEARCH_LENGTH);
}

export function createRankedListings<T extends PublicListing>(
  listings: T[],
): RankedListing<T>[] {
  return listings.map((listing, index) => ({ listing, rank: index + 1 }));
}

export function searchRankedListings<T extends PublicListing>(
  listings: T[],
  query: string,
): RankedListing<T>[] {
  const rankedListings = createRankedListings(listings);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return rankedListings;

  const compactQuery = normalizedQuery.replace(/\s/g, "");

  return rankedListings.filter(({ listing }) => {
    const searchable = normalizeSearchText(
      `${listing.name} ${listing.url} ${listing.description}`,
    );
    return (
      searchable.includes(normalizedQuery) ||
      searchable.replace(/\s/g, "").includes(compactQuery)
    );
  });
}
