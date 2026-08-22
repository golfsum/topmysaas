import type { Metadata } from "next";
import { connection } from "next/server";
import { LaunchSoonHome } from "@/components/public/launch-soon-home";
import { PublicHome } from "@/components/public/public-home";
import {
  isBeforeInitialLaunch,
  isLaunchPageEnabled,
  resolveInitialLaunchAt,
} from "@/lib/domain/launch";
import { parseLeaderboardPage } from "@/lib/domain/leaderboard-pagination";
import { parseListingSearchQuery } from "@/lib/domain/listing-search";
import { getLeaderboardSnapshot } from "@/lib/server/board-data";

function initialLaunchAt() {
  const developmentOverride =
    process.env.NODE_ENV === "production" ? undefined : process.env.LAUNCH_AT;
  return resolveInitialLaunchAt(developmentOverride);
}

function shouldShowLaunchPage(now: Date, launchAt: string) {
  return (
    isLaunchPageEnabled(process.env.LAUNCH_MODE) &&
    isBeforeInitialLaunch(now, launchAt)
  );
}

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return shouldShowLaunchPage(new Date(), initialLaunchAt())
    ? {
      title: "TopMySaaS | Launching Soon, Bidding Open",
      description:
        "The weekly TopMySaaS leaderboard is launching soon. Every active paid listing is ranked by total bid, with the Top 5 highlighted.",
      }
    : {
      title: "TopMySaaS | Top 5 SaaS Ranked by Bid",
      description:
        "Every active paid SaaS listing is ranked by bid, with the Top 5 highlighted. The leaderboard resets every Monday at 00:00 UTC.",
    };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string | string[];
    page?: string | string[];
    q?: string | string[];
  }>;
}) {
  await connection();
  const requestTime = new Date();
  const launchAt = initialLaunchAt();
  const launchMode = shouldShowLaunchPage(requestTime, launchAt);
  const [resolvedSearchParams, initialSnapshot] = await Promise.all([
    searchParams,
    getLeaderboardSnapshot(requestTime),
  ]);
  const requestedPage = parseLeaderboardPage(resolvedSearchParams.page);
  const searchQuery = parseListingSearchQuery(resolvedSearchParams.q);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TopMySaaS",
    url: "https://topmysaas.com/",
    description: launchMode
      ? "The weekly SaaS ranking leaderboard is launching soon, and bidding is open now."
      : "A weekly SaaS leaderboard where every active paid listing is ranked and the Top 5 are highlighted.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {launchMode ? (
        <LaunchSoonHome
          initialSnapshot={initialSnapshot}
          checkoutCancelled={resolvedSearchParams.checkout === "cancelled"}
          requestedPage={requestedPage}
          searchQuery={searchQuery}
          launchAt={launchAt}
          serverNow={requestTime.toISOString()}
        />
      ) : (
        <PublicHome
          initialSnapshot={initialSnapshot}
          checkoutCancelled={resolvedSearchParams.checkout === "cancelled"}
          requestedPage={requestedPage}
          searchQuery={searchQuery}
        />
      )}
    </>
  );
}
