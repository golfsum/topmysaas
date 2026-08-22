import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Gavel,
  Trophy,
} from "lucide-react";

import { formatUsd } from "@/lib/domain/money";
import type { AdminDashboardData } from "@/lib/domain/types";

export type AdminView = "overview" | "listings" | "bids" | "settings";

type OverviewSectionProps = {
  dashboard: AdminDashboardData;
  onNavigate: (view: AdminView) => void;
};

function formatResetTime(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(isoDate));
}

export function OverviewSection({
  dashboard,
  onNavigate,
}: OverviewSectionProps) {
  const activeListings = dashboard.listings.filter(
    (listing) => listing.isActive,
  ).length;
  const stats = [
    {
      label: "Revenue this week",
      value: formatUsd(dashboard.currentWeek.revenueCents, true),
      detail: `${dashboard.currentWeek.bidCount.toLocaleString("en-US")} paid ${
        dashboard.currentWeek.bidCount === 1 ? "bid" : "bids"
      }`,
      icon: CircleDollarSign,
    },
    {
      label: "All-time revenue",
      value: formatUsd(dashboard.allTime.revenueCents, true),
      detail: `${dashboard.allTime.bidCount.toLocaleString("en-US")} total ${
        dashboard.allTime.bidCount === 1 ? "bid" : "bids"
      }`,
      icon: Gavel,
    },
    {
      label: "Active listings",
      value: activeListings.toLocaleString("en-US"),
      detail: `${Math.min(activeListings, 5)} of 5 ranked spots filled`,
      icon: Trophy,
    },
    {
      label: "Next reset",
      value: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(new Date(dashboard.nextResetAt)),
      detail: "Every Monday at 00:00 UTC",
      icon: CalendarClock,
    },
  ] as const;

  const topFive = dashboard.listings
    .filter((listing) => listing.isActive)
    .toSorted(
      (left, right) =>
        right.bidAmountCents - left.bidAmountCents ||
        left.createdAt.localeCompare(right.createdAt),
    )
    .slice(0, 5);

  return (
    <div className="space-y-7">
      <section aria-labelledby="overview-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#67e85f]">
              Current week
            </p>
            <h1
              id="overview-title"
              className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl"
            >
              Board overview
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Week {dashboard.weekId}. Resets {formatResetTime(dashboard.nextResetAt)}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("listings")}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e85f] sm:self-auto"
          >
            Manage listings
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, detail, icon: Icon }) => (
            <article
              key={label}
              className="rounded-2xl border border-white/8 bg-[#0d1010] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-zinc-400">{label}</p>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#67e85f]/15 bg-[#67e85f]/8 text-[#86f27f]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-5 font-mono text-2xl font-semibold tracking-[-0.04em] text-white tabular-nums">
                {value}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="current-leaders-title"
        className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1010]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <h2 id="current-leaders-title" className="font-semibold text-white">
              Current leaders
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Live paid totals for this week</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#86f27f]">
            <span className="h-2 w-2 rounded-full bg-[#67e85f] shadow-[0_0_12px_rgba(103,232,95,0.65)]" />
            Live
          </span>
        </div>

        {topFive.length > 0 ? (
          <ol className="divide-y divide-white/6">
            {topFive.map((listing, index) => (
              <li
                key={listing.id}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:px-6"
              >
                <span className="font-mono text-sm text-zinc-500 tabular-nums">
                  #{index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-100">
                    {listing.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-zinc-500">
                    {listing.description}
                  </span>
                </span>
                <span className="font-mono text-sm font-semibold text-[#86f27f] tabular-nums sm:text-base">
                  {formatUsd(listing.bidAmountCents, true)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-6 py-12 text-center">
            <Trophy className="mx-auto h-6 w-6 text-zinc-600" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-300">
              No active listings yet
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Add a listing or wait for the first paid bid.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
