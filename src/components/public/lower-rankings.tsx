"use client";

import { ArrowUpRight, ExternalLink } from "lucide-react";

import {
  MAX_TARGETABLE_RANK,
  type BoardSettings,
} from "@/lib/domain/types";
import type { RankedListing } from "@/lib/domain/listing-search";
import { listingVisitPath } from "@/lib/domain/listing-links";
import { ListingIcon } from "./listing-icon";

type LowerRankingsProps = {
  rankedListings: RankedListing[];
  settings: BoardSettings;
  biddingEnabled: boolean;
  disabledBidLabel: string;
  trackClicks: boolean;
  onBid: (rank?: number) => void;
  heading?: string;
  description?: string;
  rangeLabel?: string;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function minimumForListing(
  listing: RankedListing["listing"],
  settings: BoardSettings,
) {
  return Math.max(
    settings.minBidCents,
    listing.bidAmountCents + settings.minIncrementCents,
  );
}

function safeListingUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function displayDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function LowerRankings({
  rankedListings,
  settings,
  biddingEnabled,
  disabledBidLabel,
  trackClicks,
  onBid,
  heading = "More ranked listings",
  description = "Every active paid listing keeps its live rank. The Top 5 stand out above.",
  rangeLabel,
}: LowerRankingsProps) {
  if (rankedListings.length === 0) return null;

  const firstRank = rankedListings[0].rank;
  const lastRank = rankedListings.at(-1)?.rank ?? firstRank;

  return (
    <section
      aria-labelledby="more-rankings-title"
      className="mt-6 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0d10]"
    >
      <div className="flex flex-col gap-1 border-b border-white/[0.08] bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3
            id="more-rankings-title"
            className="text-sm font-bold text-[#dce1e5]"
          >
            {heading}
          </h3>
          <p className="mt-0.5 text-xs text-[#8f98a1]">
            {description}
          </p>
        </div>
        <span className="mt-1 text-xs font-medium text-[#8f98a1] sm:mt-0">
          {rangeLabel ?? `Ranks #${firstRank}–#${lastRank}`}
        </span>
      </div>

      <ol>
        {rankedListings.map(({ listing, rank }) => {
          const minimum = minimumForListing(listing, settings);
          const safeUrl = safeListingUrl(listing.url);
          const listingHref = safeUrl
            ? trackClicks
              ? listingVisitPath(listing.id)
              : safeUrl
            : null;
          const canTargetRank = rank <= MAX_TARGETABLE_RANK;

          return (
            <li
              key={listing.id}
              value={rank}
              className="listing-row grid gap-3 border-b border-white/[0.065] px-4 py-4 transition-colors last:border-b-0 hover:bg-white/[0.025] sm:grid-cols-[56px_minmax(0,1fr)_120px_210px] sm:items-center sm:px-5"
            >
              <div className="flex items-center justify-between gap-4 sm:block">
                <span className="tabular-nums text-sm font-extrabold text-[#c8ced3]">
                  #{rank}
                </span>
                <span className="tabular-nums text-sm font-bold text-[#67e85f] sm:hidden">
                  {formatMoney(listing.bidAmountCents)}
                </span>
              </div>

              <div className="min-w-0">
                {listingHref ? (
                  <a
                    href={listingHref}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    aria-label={`Visit ${listing.name}, opens in a new tab`}
                    className="listing-row-link group flex min-h-11 max-w-full items-center gap-2.5 rounded-sm"
                  >
                    <ListingIcon
                      name={listing.name}
                      url={listing.url}
                      size="small"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-white group-hover:text-[#83f27c] sm:text-[15px]">
                        {listing.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#67e85f]">
                        {displayDomain(listing.url)}
                      </span>
                    </span>
                    <ExternalLink
                      aria-hidden="true"
                      size={13}
                      className="shrink-0 text-[#67e85f]"
                    />
                  </a>
                ) : (
                  <span className="flex items-center gap-2.5">
                    <ListingIcon
                      name={listing.name}
                      url={listing.url}
                      size="small"
                    />
                    <span className="truncate text-sm font-bold text-white sm:text-[15px]">
                      {listing.name}
                    </span>
                  </span>
                )}
                <p className="mt-1 line-clamp-1 text-xs text-[#8f98a1]">
                  {listing.description}
                </p>
              </div>

              <span className="tabular-nums hidden text-sm font-bold text-[#67e85f] sm:block">
                {formatMoney(listing.bidAmountCents)}
              </span>

              <button
                type="button"
                onClick={() => onBid(canTargetRank ? rank : undefined)}
                disabled={!biddingEnabled}
                aria-label={
                  biddingEnabled
                    ? canTargetRank
                      ? `Claim rank ${rank} for ${formatMoney(minimum)}`
                      : "Place a bid to move up the leaderboard"
                    : disabledBidLabel
                }
                className="listing-claim-control listing-claim-reveal inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[#67e85f]/25 bg-[#67e85f]/10 px-3 text-xs font-bold text-[#83f27c] transition-[color,background-color,border-color,opacity,transform] hover:border-[#67e85f]/45 hover:bg-[#67e85f]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-[#747e87]"
              >
                {biddingEnabled
                  ? canTargetRank
                    ? (
                        <span className="whitespace-nowrap">
                          Claim this spot for {formatMoney(minimum)}
                        </span>
                      )
                    : "Place a bid"
                  : disabledBidLabel}
                <ArrowUpRight aria-hidden="true" size={13} />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
