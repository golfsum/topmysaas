"use client";

import {
  DEFAULT_BOARD_SETTINGS,
  type BoardSettings,
  type LeaderboardSnapshot,
  type PublicListing,
} from "@/lib/domain/types";
import {
  ArrowDown,
  ArrowUpRight,
  Bolt,
  Check,
  Clock3,
  ExternalLink,
  Gavel,
  LockKeyhole,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BidDialog, type BidTarget } from "./bid-dialog";
import { Countdown } from "./countdown";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type LoadPhase = "loading" | "ready" | "stale" | "error";

type LaunchSoonHomeProps = {
  initialSnapshot?: LeaderboardSnapshot | null;
  checkoutCancelled?: boolean;
};

const launchRules = [
  "Only five weekly spots are available.",
  "Rank is based only on successfully paid bid totals.",
  "A higher total can move any listing down immediately.",
  "On the original secure device, rebids charge only the difference.",
  "The board resets every Monday at 00:00 UTC.",
  "Spam, adult, illegal, or misleading listings are removed without refund.",
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

function minimumForSpot(
  listing: PublicListing | undefined,
  settings: BoardSettings,
) {
  return listing
    ? Math.max(
        settings.minBidCents,
        listing.bidAmountCents + settings.minIncrementCents,
      )
    : settings.minBidCents;
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

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "S";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function LaunchSoonHome({
  initialSnapshot = null,
  checkoutCancelled = false,
}: LaunchSoonHomeProps) {
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
    minimumTotalCents:
      initialSnapshot?.settings.minBidCents ??
      DEFAULT_BOARD_SETTINGS.minBidCents,
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
  const listings = snapshot?.listings.slice(0, 5) ?? [];
  const topListing = listings[0];
  const boardKnown =
    snapshot?.source === "firestore" || snapshot?.source === "demo";
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
      : "Checking auction";
  const statusLabel =
    phase === "error"
      ? "Auction unavailable"
      : phase === "stale"
        ? "Reconnecting"
        : snapshot?.source === "demo"
          ? "Preview auction"
          : biddingPaused
            ? "Reset window"
            : "Launch bidding open";
  const statusWarning =
    phase === "error" ||
    phase === "stale" ||
    snapshot?.source === "demo" ||
    biddingPaused;

  const openBid = (rank?: number) => {
    if (!snapshot || !biddingEnabled) return;
    const listing = rank ? listings[rank - 1] : undefined;
    setBidTarget({
      rank,
      minimumTotalCents: minimumForSpot(listing, settings),
    });
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
        <section className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pb-18 sm:pt-14 lg:px-8 lg:pt-18">
          <div
            aria-hidden="true"
            className="brand-grid pointer-events-none absolute inset-0 opacity-70"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full bg-[#67e85f]/[0.07] blur-[110px]"
          />

          <div className="relative mx-auto grid w-full max-w-[1120px] gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[#67e85f]/25 bg-[#67e85f]/10 px-3 text-[11px] font-bold uppercase tracking-[0.13em] text-[#83f27c]">
                  <Rocket aria-hidden="true" size={13} />
                  Launching soon
                </span>
                <span
                  className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    statusWarning
                      ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-200"
                      : "border-white/10 bg-white/[0.04] text-[#cbd2d7]"
                  }`}
                >
                  {statusWarning ? (
                    <TriangleAlert aria-hidden="true" size={13} />
                  ) : (
                    <Bolt aria-hidden="true" size={13} fill="currentColor" />
                  )}
                  {statusLabel}
                </span>
              </div>

              <h1 className="text-balance mt-6 max-w-3xl text-[42px] font-extrabold leading-[1.03] tracking-[-0.05em] text-white sm:text-[56px] lg:text-[64px]">
                The weekly Top 5 SaaS auction is{" "}
                <span className="text-[#67e85f]">launching soon.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#aab2ba] sm:text-lg sm:leading-8">
                The full leaderboard is almost ready. Bidding is open now, and
                every successful payment enters this week&apos;s live ranking.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => openBid()}
                  disabled={!biddingEnabled}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-6 text-[15px] font-bold text-[#071006] shadow-[0_0_32px_rgba(103,232,95,0.16)] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b]"
                >
                  <Gavel aria-hidden="true" size={17} strokeWidth={2.5} />
                  {biddingEnabled
                    ? `Place a launch bid from ${formatMoney(settings.minBidCents)}`
                    : disabledBidLabel}
                </button>
                <a
                  href="#leaderboard"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-5 text-sm font-bold text-[#dce1e5] transition-colors hover:border-white/20 hover:bg-white/[0.065] hover:text-white"
                >
                  See current bids
                  <ArrowDown aria-hidden="true" size={16} />
                </a>
              </div>

              <p className="mt-4 flex max-w-xl items-start gap-2 text-xs leading-5 text-[#8f98a1]">
                <LockKeyhole
                  aria-hidden="true"
                  size={13}
                  className="mt-0.5 shrink-0 text-[#67e85f]"
                />
                Bids are final and non-refundable. Rank is competitive and can
                change at any time. Stripe securely handles payment details.
              </p>

              {showCheckoutCancelled ? (
                <div
                  role="status"
                  className="mt-6 flex max-w-xl items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-[#c8ced3]"
                >
                  <span>
                    Checkout was canceled. No payment was taken and the ranking
                    did not change.
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
                <div className="mt-6 max-w-xl rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">
                  JavaScript is required to place a bid. Current bids and legal
                  pages remain available.
                </div>
              </noscript>
            </div>

            <div
              id="bid"
              className="scroll-mt-24 rounded-2xl border border-[#37414a] bg-[linear-gradient(145deg,rgba(19,24,28,0.98),rgba(10,13,16,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.36)] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#67e85f]">
                    This week&apos;s auction
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold tracking-[-0.03em]">
                    The first five are forming now
                  </h2>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[11px] text-[#aab2ba]">
                  <Clock3 aria-hidden="true" size={12} />
                  Resets in <Countdown nextResetAt={resetAt} />
                </span>
              </div>

              {phase === "error" && !snapshot ? (
                <div className="py-9 text-center">
                  <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-200">
                    <TriangleAlert aria-hidden="true" size={20} />
                  </span>
                  <p className="mt-4 font-bold">The auction is unavailable</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#aab2ba]">
                    We cannot safely calculate a bid until the current totals
                    load.
                  </p>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-amber-200/20 bg-amber-200/[0.08] px-5 text-sm font-bold text-amber-100 transition-colors hover:bg-amber-200/[0.13]"
                  >
                    <RefreshCw aria-hidden="true" size={15} />
                    Retry auction
                  </button>
                </div>
              ) : phase === "loading" && !snapshot ? (
                <div className="animate-pulse py-7" aria-label="Loading current auction">
                  <div className="h-3 w-24 rounded bg-white/[0.07]" />
                  <div className="mt-4 h-10 w-36 rounded bg-white/[0.08]" />
                  <div className="mt-4 h-14 w-full rounded-xl bg-white/[0.06]" />
                </div>
              ) : topListing ? (
                <div className="pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#aab2ba]">
                    Current launch leader
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#67e85f]/30 bg-[#67e85f]/10 text-lg font-extrabold tracking-[-0.04em] text-[#83f27c]"
                    >
                      {initials(topListing.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold tracking-[-0.025em]">
                        {topListing.name}
                      </p>
                      {safeListingUrl(topListing.url) ? (
                        <a
                          href={safeListingUrl(topListing.url) ?? undefined}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-sm text-xs font-medium text-[#67e85f] underline decoration-[#67e85f]/20 underline-offset-2 hover:text-[#8af384]"
                        >
                          <span className="truncate">
                            {displayDomain(topListing.url)}
                          </span>
                          <ExternalLink
                            aria-hidden="true"
                            size={11}
                            className="shrink-0"
                          />
                          <span className="sr-only">opens in a new tab</span>
                        </a>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums text-2xl font-extrabold tracking-[-0.035em] text-[#67e85f]">
                        {formatMoney(topListing.bidAmountCents)}
                      </p>
                      <p className="mt-1 text-[11px] text-[#8f98a1]">
                        weekly total
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#aab2ba]">
                    {topListing.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => openBid(1)}
                    disabled={!biddingEnabled}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-5 text-sm font-bold text-[#071006] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b]"
                  >
                    <Gavel aria-hidden="true" size={17} strokeWidth={2.5} />
                    {biddingEnabled
                      ? `Take #1 for ${formatMoney(minimumForSpot(topListing, settings))}`
                      : disabledBidLabel}
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#67e85f]/25 bg-[#67e85f]/10 text-[#67e85f]">
                    <Sparkles aria-hidden="true" size={22} />
                  </span>
                  <p className="mt-4 text-lg font-bold tracking-[-0.025em]">
                    The #1 spot is open
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#aab2ba]">
                    Be the first successful bid on this week&apos;s launch board.
                    No account is required.
                  </p>
                  <button
                    type="button"
                    onClick={() => openBid(1)}
                    disabled={!biddingEnabled}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#67e85f] px-5 text-sm font-bold text-[#071006] transition-colors hover:bg-[#78f271] active:bg-[#52ce4c] disabled:cursor-not-allowed disabled:bg-[#36453a] disabled:text-[#89948b]"
                  >
                    <Gavel aria-hidden="true" size={17} />
                    {biddingEnabled
                      ? `Place the first bid from ${formatMoney(settings.minBidCents)}`
                      : disabledBidLabel}
                  </button>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-5 text-xs text-[#8f98a1]">
                <span className="inline-flex items-center gap-1.5">
                  <Check aria-hidden="true" size={13} className="text-[#67e85f]" />
                  No login required
                </span>
                <span className="inline-flex items-center justify-end gap-1.5 text-right">
                  <ShieldCheck
                    aria-hidden="true"
                    size={13}
                    className="text-[#67e85f]"
                  />
                  Stripe Checkout
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="leaderboard"
          aria-labelledby="launch-board-title"
          className="scroll-mt-24 border-y border-white/10 bg-[#090c0f]/75 px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
        >
          <div className="mx-auto w-full max-w-[980px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    id="launch-board-title"
                    className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl"
                  >
                    Current launch bids
                  </h2>
                  {snapshot?.source === "demo" ? (
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-amber-200">
                      Preview data
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aab2ba]">
                  These are the five weekly positions forming before the full
                  leaderboard launches. Successful payments re-rank them
                  automatically.
                </p>
              </div>
              {phase === "stale" ? (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  Reconnecting to live totals
                </span>
              ) : phase === "ready" ? (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-[#aab2ba]">
                  <span className="live-dot h-2 w-2 rounded-full bg-[#67e85f]" />
                  Updates every 15 seconds
                </span>
              ) : null}
            </div>

            <ol className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1013]">
              {Array.from({ length: 5 }, (_, index) => {
                const listing = listings[index];
                const rank = index + 1;
                const safeUrl = listing ? safeListingUrl(listing.url) : null;

                return (
                  <li
                    key={listing?.id ?? `open-${rank}`}
                    className={`grid min-h-[76px] grid-cols-[46px_1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[58px_1fr_150px] sm:px-5 ${
                      index > 0 ? "border-t border-white/[0.07]" : ""
                    }`}
                  >
                    <span
                      className={`tabular-nums text-lg font-bold ${
                        rank === 1 ? "text-[#67e85f]" : "text-[#c8ced3]"
                      }`}
                    >
                      #{rank}
                    </span>
                    {listing ? (
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-[15px] font-bold text-white sm:text-base">
                            {listing.name}
                          </p>
                          {safeUrl ? (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="sponsored nofollow noopener noreferrer"
                              aria-label={`Visit ${listing.name}, opens in a new tab`}
                              className="shrink-0 rounded-sm text-[#67e85f] transition-colors hover:text-[#8af384]"
                            >
                              <ArrowUpRight aria-hidden="true" size={14} />
                            </a>
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#8f98a1] sm:text-[13px]">
                          {listing.description}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[15px] font-semibold text-[#dce1e5]">
                          Open for bids
                        </p>
                        <p className="mt-0.5 text-xs text-[#747e87]">
                          A successful total can claim this position
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p
                        className={`tabular-nums text-[15px] font-bold sm:text-base ${
                          listing ? "text-[#67e85f]" : "text-[#8f98a1]"
                        }`}
                      >
                        {listing
                          ? formatMoney(listing.bidAmountCents)
                          : formatMoney(settings.minBidCents)}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[#747e87]">
                        {listing ? "current total" : "starting bid"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#aab2ba]">
                Want a specific position? Set any total above its current bid.
                The server verifies the ranking again before Checkout starts.
              </p>
              <button
                type="button"
                onClick={() => openBid()}
                disabled={!biddingEnabled}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#67e85f]/30 bg-[#67e85f]/10 px-5 text-sm font-bold text-[#83f27c] transition-colors hover:bg-[#67e85f]/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-[#747e87]"
              >
                <Gavel aria-hidden="true" size={16} />
                {biddingEnabled ? "Place a launch bid" : disabledBidLabel}
              </button>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-title"
          className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto w-full max-w-[980px]">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#67e85f]">
                Simple by design
              </p>
              <h2
                id="how-it-works-title"
                className="mt-2 text-3xl font-bold tracking-[-0.04em]"
              >
                Bid in three steps
              </h2>
            </div>
            <ol className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                ["01", "Add your SaaS", "Enter a name, website, short description, and your new total bid."],
                ["02", "Pay with Stripe", "Checkout securely. New listings pay the full total; eligible rebids pay the difference."],
                ["03", "Ranking updates", "After Stripe confirms payment, Firestore re-ranks the current weekly board automatically."],
              ].map(([number, title, description]) => (
                <li
                  key={number}
                  className="rounded-2xl border border-white/10 bg-[#0d1013] p-5 sm:p-6"
                >
                  <span className="tabular-nums text-xs font-extrabold tracking-[0.12em] text-[#67e85f]">
                    {number}
                  </span>
                  <h3 className="mt-4 text-lg font-bold tracking-[-0.025em]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#aab2ba]">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="rules"
          aria-labelledby="rules-title"
          className="scroll-mt-24 px-4 pb-18 sm:px-6 sm:pb-22 lg:px-8"
        >
          <div className="mx-auto grid w-full max-w-[980px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,20,23,0.98),rgba(9,12,15,0.98))] md:grid-cols-[0.82fr_1.18fr]">
            <div className="border-b border-white/10 p-6 sm:p-8 md:border-b-0 md:border-r">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#67e85f]">
                Before you bid
              </p>
              <h2
                id="rules-title"
                className="mt-2 text-3xl font-bold tracking-[-0.04em]"
              >
                Clear rules. No accounts.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#aab2ba]">
                Placement is competitive and temporary. There is no guarantee
                of traffic, clicks, leads, or business results.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
                <a
                  href="/terms"
                  className="rounded-sm text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
                >
                  Read the Terms
                </a>
                <a
                  href="/privacy"
                  className="rounded-sm text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
            <ul className="grid gap-x-6 gap-y-4 p-6 sm:p-8 lg:grid-cols-2">
              {launchRules.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-3 text-sm leading-6 text-[#c8ced3]"
                >
                  <Check
                    aria-hidden="true"
                    size={16}
                    className="mt-1 shrink-0 text-[#67e85f]"
                    strokeWidth={2.5}
                  />
                  {rule}
                </li>
              ))}
            </ul>
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
