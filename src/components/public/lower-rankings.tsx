"use client";

import { ArrowUpRight, ExternalLink } from "lucide-react";

import {
  MAX_TARGETABLE_RANK,
  type BoardSettings,
  type PublicListing,
} from "@/lib/domain/types";
import { listingVisitPath } from "@/lib/domain/listing-links";

type LowerRankingsProps = {
  listings: PublicListing[];
  startRank: number;
  settings: BoardSettings;
  biddingEnabled: boolean;
  disabledBidLabel: string;
  trackClicks: boolean;
  onBid: (rank?: number) => void;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function minimumForListing(
  listing: PublicListing,
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
  listings,
  startRank,
  settings,
  biddingEnabled,
  disabledBidLabel,
  trackClicks,
  onBid,
}: LowerRankingsProps) {
  if (listings.length === 0) return null;

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
            More ranked listings
          </h3>
          <p className="mt-0.5 text-xs text-[#8f98a1]">
            Every active paid listing keeps its live rank. The Top 5 stand out above.
          </p>
        </div>
        <span className="mt-1 text-xs font-medium text-[#8f98a1] sm:mt-0">
          Ranks #{startRank}–#{startRank + listings.length - 1}
        </span>
      </div>

      <ol start={startRank}>
        {listings.map((listing, index) => {
          const rank = startRank + index;
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
              className="grid gap-3 border-b border-white/[0.065] px-4 py-4 last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)_120px_170px] sm:items-center sm:px-5"
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
                    className="group inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f]"
                  >
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
                  <span className="truncate text-sm font-bold text-white sm:text-[15px]">
                    {listing.name}
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
                      ? `Bid for rank ${rank} from ${formatMoney(minimum)}`
                      : "Place a bid to move up the leaderboard"
                    : disabledBidLabel
                }
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-xs font-bold text-[#dce1e5] transition-colors hover:border-[#67e85f]/30 hover:bg-[#67e85f]/10 hover:text-[#83f27c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] disabled:cursor-not-allowed disabled:text-[#747e87]"
              >
                {biddingEnabled
                  ? canTargetRank
                    ? `Bid for #${rank} from ${formatMoney(minimum)}`
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
