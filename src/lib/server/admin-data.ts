import "server-only";

import { AggregateField } from "firebase-admin/firestore";

import type { AdminDashboardData, RevenueStats } from "@/lib/domain/types";
import { getUtcWeekBounds } from "@/lib/domain/week";

import { requireAdminSession } from "./admin-auth";
import { getBoardGeneration } from "./board-state";
import { getBoardSettings } from "./board-data";
import { getAdminDb } from "./firebase-admin";
import { mapAdminListing, mapBidActivity } from "./firestore-mappers";
import { boardPeriodId, listingIdForUrl } from "./listing-identity";

function mapRevenueStats(data: Record<string, unknown>): RevenueStats {
  return {
    revenueCents:
      typeof data.revenueCents === "number" && Number.isFinite(data.revenueCents)
        ? data.revenueCents
        : 0,
    bidCount:
      typeof data.bidCount === "number" && Number.isFinite(data.bidCount)
        ? data.bidCount
        : 0,
  };
}

function mapClickCount(data: Record<string, unknown> | undefined): number {
  const value = data?.clickCount;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

export async function getAdminDashboard(
  now = new Date(),
): Promise<AdminDashboardData> {
  await requireAdminSession();

  const db = getAdminDb();
  const { weekId, nextResetAt } = getUtcWeekBounds(now);
  const boardGeneration = await getBoardGeneration(weekId);
  const currentBids = db.collection("bids").where("weekId", "==", weekId);
  const allBids = db.collection("bids");
  const periodId = boardPeriodId(weekId, boardGeneration);

  const [
    currentAggregation,
    allTimeAggregation,
    listingsSnapshot,
    recentBidsSnapshot,
    settings,
    boardClicksSnapshot,
  ] = await Promise.all([
    currentBids
      .aggregate({
        revenueCents: AggregateField.sum("amountCents"),
        bidCount: AggregateField.count(),
      })
      .get(),
    allBids
      .aggregate({
        revenueCents: AggregateField.sum("amountCents"),
        bidCount: AggregateField.count(),
      })
      .get(),
    db
      .collection("listings")
      .where("weekId", "==", weekId)
      .where("boardGeneration", "==", boardGeneration)
      .orderBy("bidAmountCents", "desc")
      .orderBy("createdAt", "asc")
      .get(),
    db.collection("bids").orderBy("createdAt", "desc").limit(50).get(),
    getBoardSettings(),
    db.collection("boardClickStats").doc(periodId).get(),
  ]);

  const listingStatsIds = listingsSnapshot.docs.map((snapshot) => {
    const data = snapshot.data();
    const normalizedUrl =
      typeof data.normalizedUrl === "string"
        ? data.normalizedUrl
        : typeof data.url === "string"
          ? data.url
          : snapshot.id;
    return listingIdForUrl(normalizedUrl);
  });
  const lifetimeRefs = listingStatsIds.map((statsId) =>
    db.collection("listingClickStats").doc(statsId),
  );
  const currentPeriodRefs = listingStatsIds.map((statsId) =>
    db
      .collection("listingClickStats")
      .doc(statsId)
      .collection("periods")
      .doc(periodId),
  );
  const clickSnapshots =
    lifetimeRefs.length > 0
      ? await db.getAll(...lifetimeRefs, ...currentPeriodRefs)
      : [];
  const clickCountByPath = new Map(
    clickSnapshots.map((snapshot) => [
      snapshot.ref.path,
      mapClickCount(snapshot.data() as Record<string, unknown> | undefined),
    ]),
  );
  const listings = listingsSnapshot.docs.map((snapshot, index) => ({
    ...mapAdminListing(snapshot),
    clickCount: clickCountByPath.get(lifetimeRefs[index].path) ?? 0,
    currentBoardClickCount:
      clickCountByPath.get(currentPeriodRefs[index].path) ?? 0,
  }));

  return {
    currentWeek: mapRevenueStats(
      currentAggregation.data() as Record<string, unknown>,
    ),
    allTime: mapRevenueStats(
      allTimeAggregation.data() as Record<string, unknown>,
    ),
    currentBoardClickCount: mapClickCount(
      boardClicksSnapshot.data() as Record<string, unknown> | undefined,
    ),
    listings,
    recentBids: recentBidsSnapshot.docs.map(mapBidActivity),
    settings,
    weekId,
    nextResetAt: nextResetAt.toISOString(),
  };
}
