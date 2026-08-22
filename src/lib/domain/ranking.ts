import type { PublicListing } from "./types";

export function rankListings<T extends PublicListing>(listings: T[]): T[] {
  return [...listings].sort((left, right) => {
    const byBid = right.bidAmountCents - left.bidAmountCents;
    if (byBid !== 0) return byBid;

    const byCreated = left.createdAt.localeCompare(right.createdAt);
    if (byCreated !== 0) return byCreated;

    return left.id.localeCompare(right.id);
  });
}

export function getTopFive<T extends PublicListing>(listings: T[]): T[] {
  return rankListings(listings).slice(0, 5);
}

export function findRank(
  listings: PublicListing[],
  listingId: string,
): number | null {
  const index = rankListings(listings).findIndex(
    (listing) => listing.id === listingId,
  );
  return index === -1 ? null : index + 1;
}
