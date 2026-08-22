"use client";

import {
  DEFAULT_BOARD_SETTINGS,
  type BoardSettings,
  type LeaderboardSnapshot,
  type PublicListing,
} from "@/lib/domain/types";
import {
  ArrowUpRight,
  Bolt,
  Check,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Gavel,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BidDialog, type BidTarget } from "./bid-dialog";
import { Countdown } from "./countdown";
import { LowerRankings } from "./lower-rankings";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type LoadPhase = "loading" | "ready" | "stale" | "error";

type PublicHomeProps = {
  initialSnapshot?: LeaderboardSnapshot | null;
  checkoutCancelled?: boolean;
};

const rules = [
  "The Top 5 are highlighted; every active paid listing remains ranked.",
  "Rank is determined only by the total amount bid.",
  "Highest bid takes the highest rank.",
  "On the original secure device, raise your bid and pay only the difference.",
  "Equal totals keep the earlier listing ahead.",
  "The board resets every Monday at 00:00 UTC.",
  "No login is required.",
  "Spam and adult content will be removed.",
] as const;

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function nextMondayUtc() {
  const now = new Date();
  const next = new Date(now);
  const daysUntilMonday = ((8 - now.getUTCDay()) % 7) || 7;
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

function listingUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
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

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "S";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function minimumForSpot(listing: PublicListing | undefined, settings: BoardSettings) {
  return listing
    ? Math.max(settings.minBidCents, listing.bidAmountCents + settings.minIncrementCents)
    : settings.minBidCents;
}

function ProductMark({ listing, rank, large = false }: { listing: PublicListing; rank: number; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border font-extrabold tracking-[-0.04em] ${
        large ? "h-16 w-16 text-xl sm:h-[72px] sm:w-[72px] sm:text-2xl" : "h-11 w-11 text-sm"
      } ${
        rank === 1
          ? "border-[#67e85f]/35 bg-[#67e85f]/15 text-[#8af384] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-white/10 bg-white/[0.055] text-[#dce1e5]"
      }`}
    >
      {initials(listing.name)}
    </span>
  );
}

function ProductDetails({ listing, rank, large = false }: { listing: PublicListing; rank: number; large?: boolean }) {
  const safeUrl = listingUrl(listing.url);
  return (
    <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
      <ProductMark listing={listing} rank={rank} large={large} />
      <div className="min-w-0">
        <p className={`${large ? "text-xl sm:text-2xl" : "text-[15px] sm:text-base"} break-words font-bold tracking-[-0.02em] text-white`}>
          {listing.name}
        </p>
        <p className={`${large ? "mt-1.5 text-sm sm:text-[15px]" : "mt-0.5 text-[13px]"} leading-5 text-[#aab2ba] md:line-clamp-2`}>
          {listing.description}
        </p>
        {safeUrl ? (
          <a
            href={safeUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className={`${large ? "mt-2" : "mt-1"} inline-flex max-w-full items-center gap-1 truncate rounded-sm text-xs font-medium text-[#67e85f] underline decoration-[#67e85f]/20 underline-offset-2 transition-colors hover:text-[#8af384] hover:decoration-[#8af384]`}
          >
            <span className="truncate">{displayDomain(listing.url)}</span>
            <ExternalLink aria-hidden="true" size={11} className="shrink-0" />
            <span className="sr-only">opens in a new tab</span>
          </a>
        ) : (
          <span className="mt-1 block text-xs text-[#747e87]">Website unavailable</span>
        )}
      </div>
    </div>
  );
}

function LeaderCardSkeleton() {
  return (
    <div aria-hidden="true" className="grid min-h-[170px] animate-pulse gap-6 rounded-2xl border border-white/10 bg-[#0e1114] p-5 sm:p-7 md:grid-cols-[1.3fr_0.85fr]">
      <div className="flex items-center gap-4">
        <div className="h-[72px] w-[72px] rounded-xl bg-white/[0.07]" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-40 rounded bg-white/[0.07]" />
          <div className="h-4 w-full max-w-72 rounded bg-white/[0.05]" />
          <div className="h-3 w-24 rounded bg-white/[0.05]" />
        </div>
      </div>
      <div className="space-y-3 border-white/10 md:border-l md:pl-7">
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
        <div className="h-9 w-28 rounded bg-white/[0.07]" />
        <div className="h-12 w-full rounded-lg bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function PublicHome({
  initialSnapshot = null,
  checkoutCancelled = false,
}: PublicHomeProps) {
  const initialUsableSnapshot =
    initialSnapshot?.source === "unavailable" ? null : initialSnapshot;
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(
    initialUsableSnapshot,
  );
  const snapshotRef = useRef<LeaderboardSnapshot | null>(initialUsableSnapshot);
  const [phase, setPhase] = useState<LoadPhase>(
    initialSnapshot?.source === "unavailable"
      ? "error"
      : initialSnapshot
        ? "ready"
        : "loading",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCheckoutCancelled, setShowCheckoutCancelled] =
    useState(checkoutCancelled);
  const [bidTarget, setBidTarget] = useState<BidTarget>({
    minimumTotalCents: initialSnapshot?.settings.minBidCents ?? DEFAULT_BOARD_SETTINGS.minBidCents,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/leaderboard", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Leaderboard request failed");

      const data = (await response.json()) as LeaderboardSnapshot;
      if (!Array.isArray(data.listings) || !data.settings || !data.nextResetAt) {
        throw new Error("Leaderboard response was incomplete");
      }
      if (data.source === "unavailable") {
        throw new Error("Leaderboard data is unavailable");
      }

      snapshotRef.current = data;
      setSnapshot(data);
      setPhase("ready");
    } catch {
      setPhase(snapshotRef.current ? "stale" : "error");
    }
  }, []);

  useEffect(() => {
    const poller = window.setInterval(() => void refresh(), 15_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(poller);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  const settings = snapshot?.settings ?? DEFAULT_BOARD_SETTINGS;
  const boardKnown =
    snapshot?.source === "firestore" || snapshot?.source === "demo";
  const allListings = snapshot?.listings ?? [];
  const listings = allListings.slice(0, 5);
  const lowerListings = allListings.slice(5);
  const topListing = listings[0];
  const resetAt = snapshot?.nextResetAt ?? nextMondayUtc();
  const generatedAt = Date.parse(snapshot?.generatedAt ?? "");
  const resetTime = Date.parse(resetAt);
  const biddingPaused =
    boardKnown &&
    Number.isFinite(generatedAt) &&
    Number.isFinite(resetTime) &&
    resetTime - generatedAt <= settings.checkoutCloseMinutes * 60_000;
  const demoPaymentsDisabled =
    snapshot?.source === "demo" && process.env.NODE_ENV === "production";
  const biddingEnabled =
    boardKnown && !biddingPaused && !demoPaymentsDisabled;
  const disabledBidLabel = biddingPaused
    ? "Bidding paused for reset"
    : demoPaymentsDisabled
      ? "Preview only"
      : "Checking board";
  const boardBadgeLabel =
    phase === "error"
      ? "Board unavailable"
      : phase === "stale"
        ? "Reconnecting"
      : snapshot?.source === "demo"
        ? "Preview board"
        : biddingPaused
          ? "Reset window"
          : "Live board";
  const boardBadgeWarning =
    phase === "error" ||
    phase === "stale" ||
    snapshot?.source === "demo" ||
    biddingPaused;

  const openBid = (rank?: number) => {
    if (!snapshot || !biddingEnabled) return;
    const listing = rank ? allListings[rank - 1] : undefined;
    setBidTarget({ rank, minimumTotalCents: minimumForSpot(listing, settings) });
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-transparent text-white">
      <SiteHeader
        isHome
        onPlaceBid={() => openBid()}
        bidDisabled={!biddingEnabled}
      />

      <main id="main-content">
        <section className="relative overflow-hidden px-4 pb-10 pt-9 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
          <div aria-hidden="true" className="brand-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto w-full max-w-[900px]">
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2.5">
              <span
                className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.12em] ${
                  boardBadgeWarning
                    ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-200"
                    : "border-[#67e85f]/20 bg-[#67e85f]/10 text-[#78f271]"
                }`}
              >
                {boardBadgeWarning ? (
                  <TriangleAlert aria-hidden="true" size={13} />
                ) : (
                  <Bolt aria-hidden="true" size={13} fill="currentColor" />
                )}
                {boardBadgeLabel}
              </span>
              <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs text-[#aab2ba]">
                <Clock3 aria-hidden="true" size={13} />
                Resets in <Countdown nextResetAt={resetAt} />
              </span>
            </div>

            <div className="text-center">
              <h1 className="text-balance text-[38px] font-extrabold leading-[1.06] tracking-[-0.045em] text-white sm:text-5xl md:text-[54px]">
                Top 5 SaaS. <span className="text-[#67e85f]">Ranked by bid.</span>
                <span className="block">Resets every Monday.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#aab2ba] sm:text-lg">
                Every active paid listing is ranked. The five highest bids stand out.
              </p>
            </div>

            {showCheckoutCancelled ? (
              <div
                role="status"
                className="mx-auto mt-6 flex max-w-xl items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-[#c8ced3]"
              >
                <span>
                  Checkout was canceled. No payment was taken and the board did not change.
                </span>
                <button
                  type="button"
                  onClick={() => setShowCheckoutCancelled(false)}
                  className="shrink-0 rounded-sm font-semibold text-white underline decoration-white/30 underline-offset-2"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <noscript>
              <div className="mx-auto mt-6 max-w-xl rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-center text-sm text-amber-100">
                JavaScript is required to place a bid. The current rankings and legal pages remain available.
              </div>
            </noscript>

            <div id="bid" className="scroll-mt-24 pt-7 sm:pt-8">
              {phase === "loading" && !snapshot ? (
                <LeaderCardSkeleton />
              ) : phase === "error" && !snapshot ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-6 text-center sm:p-8">
                  <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-200">
                    <TriangleAlert aria-hidden="true" size={22} />
                  </span>
                  <p className="mt-4 text-xl font-bold tracking-[-0.025em]">The live board is unavailable</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#aab2ba]">
                    We cannot safely calculate a position until the current bids load.
                  </p>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-amber-200/20 bg-amber-200/[0.08] px-5 text-sm font-bold text-amber-100 transition-colors hover:bg-amber-200/[0.13]"
                  >
                    <RefreshCw aria-hidden="true" size={15} />
                    Retry leaderboard
                  </button>
                </div>
              ) : topListing ? (
                <div className="grid min-h-[170px] gap-6 rounded-2xl border border-[#37414a] bg-[linear-gradient(135deg,rgba(20,25,29,0.98),rgba(13,17,20,0.98))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-7 md:grid-cols-[1.3fr_0.85fr] md:items-center md:gap-8">
                  <div>
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#67e85f] md:hidden">
                      Current #1
                    </p>
                    <ProductDetails listing={topListing} rank={1} large />
                  </div>
                  <div className="border-t border-white/10 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#aab2ba]">Current top bid</p>
                    <p className="tabular-nums mt-1 text-[36px] font-extrabold leading-none tracking-[-0.04em] text-[#67e85f]">
                      {formatMoney(topListing.bidAmountCents)}
                    </p>
                    <p className="mt-2 text-xs text-[#8f98a1]">Total for this week</p>
                    <button
                      type="button"
                      onClick={() => openBid(1)}
                      disabled={!biddingEnabled}
                      className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-4 text-sm font-bold text-[#071006] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b]"
                    >
                      <Gavel aria-hidden="true" size={17} strokeWidth={2.5} />
                      {biddingEnabled
                        ? `Take #1 for ${formatMoney(minimumForSpot(topListing, settings))}`
                        : disabledBidLabel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#67e85f]/25 bg-[linear-gradient(135deg,rgba(20,35,23,0.68),rgba(13,17,20,0.98))] p-6 text-center shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-8">
                  <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#67e85f]/25 bg-[#67e85f]/10 text-[#67e85f]">
                    <Trophy aria-hidden="true" size={23} />
                  </span>
                  <p className="mt-4 text-xl font-bold tracking-[-0.025em]">The #1 spot is open</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#aab2ba]">
                    Be the first product on this week&apos;s board. No account needed.
                  </p>
                  <button
                    type="button"
                    onClick={() => openBid(1)}
                    disabled={!biddingEnabled}
                    className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-6 text-sm font-bold text-[#071006] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b]"
                  >
                    <Gavel aria-hidden="true" size={17} />
                    {biddingEnabled
                      ? `Place a bid from ${formatMoney(settings.minBidCents)}`
                      : disabledBidLabel}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="leaderboard" aria-labelledby="leaderboard-title" className="scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[900px]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id="leaderboard-title" className="text-2xl font-bold tracking-[-0.035em] sm:text-[27px]">
                    Current Top 5
                  </h2>
                  {snapshot?.source === "demo" ? (
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-200">
                      Preview data
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-[#8f98a1]">Successful bids are ranked by total paid this week.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8f98a1]">
                <span className={`h-2 w-2 rounded-full ${phase === "ready" ? "live-dot bg-[#67e85f]" : phase === "stale" ? "bg-amber-300" : "bg-[#747e87]"}`} />
                {phase === "ready" ? "Updating every 15 seconds" : phase === "stale" ? "Reconnecting" : phase === "error" ? "Unavailable" : "Loading live bids"}
              </div>
            </div>

            {phase === "stale" || phase === "error" ? (
              <div role="status" className="mb-3 flex flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {phase === "stale"
                    ? "Live updates are temporarily unavailable. Showing the most recent board."
                    : "The leaderboard could not be loaded. You can retry now."}
                </span>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-200/20 px-3 font-semibold transition-colors hover:bg-amber-200/10"
                >
                  <RefreshCw aria-hidden="true" size={14} />
                  Retry
                </button>
              </div>
            ) : null}

            <div
              role="table"
              aria-label="Current Top 5 SaaS rankings"
              className="hidden overflow-hidden rounded-xl border border-[#293038] bg-[#0c0f12] md:block"
            >
              <div role="row" className="grid grid-cols-[70px_minmax(0,1fr)_150px_210px] items-center border-b border-[#293038] bg-white/[0.025] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.11em] text-[#8f98a1]">
                <span role="columnheader">Rank</span>
                <span role="columnheader">SaaS product</span>
                <span role="columnheader">Total bid</span>
                <span role="columnheader" className="sr-only">Bid action</span>
              </div>
              <div role="rowgroup">
                {Array.from({ length: 5 }, (_, index) => {
                  const rank = index + 1;
                  const listing = listings[index];
                  const minimum = minimumForSpot(listing, settings);
                  return (
                    <div
                      role="row"
                      key={listing?.id ?? `open-${rank}`}
                      className={`grid min-h-[78px] grid-cols-[70px_minmax(0,1fr)_150px_210px] items-center border-b border-white/[0.075] px-4 transition-colors last:border-b-0 hover:bg-white/[0.025] ${rank === 1 ? "bg-[#67e85f]/[0.025]" : ""}`}
                    >
                      <div role="cell">
                        <span className={`tabular-nums inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-extrabold ${rank === 1 ? "bg-[#67e85f]/15 text-[#78f271]" : "bg-white/[0.05] text-[#dce1e5]"}`}>
                          #{rank}
                        </span>
                      </div>
                      <div role="cell" className="min-w-0 py-3 pr-5">
                        {listing ? (
                          <ProductDetails listing={listing} rank={rank} />
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-[#dce1e5]">{boardKnown ? "Open spot" : "Checking spot"}</p>
                            <p className="mt-1 text-xs text-[#aab2ba]">{boardKnown ? "Ready for your product" : "Waiting for the live board"}</p>
                          </div>
                        )}
                      </div>
                      <div role="cell" className="tabular-nums text-base font-bold text-[#67e85f]">
                        {listing ? formatMoney(listing.bidAmountCents) : boardKnown ? "Open" : "..."}
                      </div>
                      <div role="cell" className="pl-3">
                        <button
                          type="button"
                          onClick={() => openBid(rank)}
                          disabled={!biddingEnabled}
                          aria-label={
                            !biddingEnabled
                              ? disabledBidLabel
                              : listing
                                ? `Take rank ${rank} for ${formatMoney(minimum)}`
                                : `Place a bid from ${formatMoney(minimum)}`
                          }
                          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#67e85f]/25 bg-[#67e85f]/10 px-3 text-[13px] font-bold text-[#78f271] transition-colors hover:border-[#67e85f]/45 hover:bg-[#67e85f]/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-[#747e87]"
                        >
                          {!biddingEnabled
                            ? disabledBidLabel
                            : listing
                              ? `Take this spot for ${formatMoney(minimum)}`
                              : `Place a bid from ${formatMoney(minimum)}`}
                          <ArrowUpRight aria-hidden="true" size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {Array.from({ length: 5 }, (_, index) => {
                const rank = index + 1;
                const listing = listings[index];
                const minimum = minimumForSpot(listing, settings);
                return (
                  <article key={listing?.id ?? `mobile-open-${rank}`} className={`rounded-xl border p-4 ${rank === 1 ? "border-[#67e85f]/25 bg-[#67e85f]/[0.035]" : "border-[#293038] bg-[#0c0f12]"}`}>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <span className={`tabular-nums inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-extrabold ${rank === 1 ? "bg-[#67e85f]/15 text-[#78f271]" : "bg-white/[0.05] text-[#dce1e5]"}`}>
                        #{rank}
                      </span>
                      <span className="tabular-nums text-right text-lg font-extrabold text-[#67e85f]">
                        {listing ? formatMoney(listing.bidAmountCents) : boardKnown ? "Open" : "..."}
                      </span>
                    </div>
                    {listing ? (
                      <ProductDetails listing={listing} rank={rank} />
                    ) : (
                      <div>
                        <p className="font-bold text-white">{boardKnown ? "This spot is open" : "Checking this spot"}</p>
                        <p className="mt-1 text-sm text-[#8f98a1]">{boardKnown ? `Add your product from ${formatMoney(settings.minBidCents)}.` : "Waiting for the live board."}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openBid(rank)}
                      disabled={!biddingEnabled}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#67e85f]/25 bg-[#67e85f]/10 px-3 text-sm font-bold text-[#78f271] transition-colors hover:bg-[#67e85f]/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-[#747e87]"
                    >
                      {!biddingEnabled
                        ? disabledBidLabel
                        : listing
                          ? `Take this spot for ${formatMoney(minimum)}`
                          : `Place a bid from ${formatMoney(minimum)}`}
                      <ArrowUpRight aria-hidden="true" size={15} />
                    </button>
                  </article>
                );
              })}
            </div>

            <LowerRankings
              listings={lowerListings}
              settings={settings}
              biddingEnabled={biddingEnabled}
              disabledBidLabel={disabledBidLabel}
              onBid={openBid}
            />

            <p className="mt-4 text-center text-xs leading-5 text-[#747e87]">
              A paid bid changes the ranking, but does not guarantee traffic, clicks, leads, or business results.
            </p>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 border-y border-white/[0.08] bg-white/[0.018] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto w-full max-w-[900px]">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#67e85f]">Simple by design</p>
              <h2 id="how-title" className="mt-2 text-3xl font-bold tracking-[-0.04em]">Bid. Pay. Move up.</h2>
              <p className="mt-3 text-[15px] leading-6 text-[#aab2ba]">No account, subscription, or waiting for approval before checkout.</p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                { number: "01", icon: CircleDollarSign, title: "Set your total", text: "Add your product and choose the total amount you want on the board." },
                { number: "02", icon: ShieldCheck, title: "Pay securely", text: "Stripe handles checkout. A listing verified on the same secure device pays only the increase." },
                { number: "03", icon: Trophy, title: "Ranking updates", text: "After payment succeeds, the board reorders by total bid." },
              ].map((step) => (
                <article key={step.number} className="rounded-xl border border-white/10 bg-[#0d1013] p-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#67e85f]/10 text-[#67e85f]">
                      <step.icon aria-hidden="true" size={19} />
                    </span>
                    <span className="tabular-nums text-xs font-bold text-[#8f98a1]">{step.number}</span>
                  </div>
                  <h3 className="mt-5 text-base font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#8f98a1]">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="rules" aria-labelledby="rules-title" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid w-full max-w-[900px] gap-8 md:grid-cols-[0.72fr_1.28fr] md:gap-14">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#67e85f]">The rules</p>
              <h2 id="rules-title" className="mt-2 text-3xl font-bold tracking-[-0.04em]">Clear and competitive.</h2>
              <p className="mt-3 text-sm leading-6 text-[#8f98a1]">
                Every week starts fresh. Rank depends on successful bids only.
              </p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {rules.map((rule) => (
                <li key={rule} className="flex items-start gap-3 rounded-lg border border-white/[0.075] bg-white/[0.022] px-3.5 py-3 text-sm leading-5 text-[#c7cdd2]">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#67e85f]/12 text-[#67e85f]">
                    <Check aria-hidden="true" size={11} strokeWidth={3} />
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[900px] flex-col items-center justify-between gap-6 rounded-2xl border border-[#67e85f]/20 bg-[#67e85f]/[0.055] p-6 text-center sm:p-8 md:flex-row md:text-left">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.035em]">Think your SaaS belongs here?</h2>
              <p className="mt-2 text-sm leading-6 text-[#aab2ba]">Place a bid in under a minute. No public account required.</p>
            </div>
            <button
              type="button"
              onClick={() => openBid()}
              disabled={!biddingEnabled}
              className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-6 text-sm font-bold text-[#071006] transition-colors hover:bg-[#78f271] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b] sm:w-auto"
            >
              <Gavel aria-hidden="true" size={17} />
              {biddingEnabled ? "Place a bid" : disabledBidLabel}
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />
      {dialogOpen ? (
        <BidDialog
          key={`${bidTarget.rank ?? "new"}-${bidTarget.minimumTotalCents}`}
          open
          settings={settings}
          target={bidTarget}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
