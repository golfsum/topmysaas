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
        "The weekly TopMySaaS leaderboard is launching soon. Every active paid listing is ranked by total bid, with the Top 5 highlighted.",
    }
  : {
      title: "TopMySaaS | Top 5 SaaS Ranked by Bid",
      description:
        "Every active paid SaaS listing is ranked by bid, with the Top 5 highlighted. The leaderboard resets every Monday at 00:00 UTC.",
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
