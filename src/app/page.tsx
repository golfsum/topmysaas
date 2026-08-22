import type { Metadata } from "next";
import { connection } from "next/server";
import { LaunchSoonHome } from "@/components/public/launch-soon-home";
import { PublicHome } from "@/components/public/public-home";
import { getLeaderboardSnapshot } from "@/lib/server/board-data";

const launchMode = process.env.LAUNCH_MODE !== "false";

export const metadata: Metadata = launchMode
  ? {
      title: "TopMySaaS | Launching Soon, Bidding Open",
      description:
        "The weekly Top 5 SaaS leaderboard is launching soon. Bidding is open now, with five spots ranked only by successful bid totals.",
    }
  : {
      title: "TopMySaaS | Top 5 SaaS Ranked by Bid",
      description:
        "Five SaaS spots ranked only by successful bids. The leaderboard resets every Monday at 00:00 UTC.",
    };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  await connection();
  const resolvedSearchParams = await searchParams;
  const initialSnapshot = await getLeaderboardSnapshot();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TopMySaaS",
    url: "https://topmysaas.com/",
    description: launchMode
      ? "The weekly Top 5 SaaS leaderboard is launching soon, and bidding is open now."
      : "A weekly Top 5 SaaS leaderboard ranked only by successful bids.",
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
        />
      ) : (
        <PublicHome
          initialSnapshot={initialSnapshot}
          checkoutCancelled={resolvedSearchParams.checkout === "cancelled"}
        />
      )}
    </>
  );
}
