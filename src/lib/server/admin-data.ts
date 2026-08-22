import "server-only";

import { AggregateField } from "firebase-admin/firestore";

import type { AdminDashboardData, RevenueStats } from "@/lib/domain/types";
import { getUtcWeekBounds } from "@/lib/domain/week";

import { requireAdminSession } from "./admin-auth";
import { getBoardGeneration } from "./board-state";
import { getBoardSettings } from "./board-data";
import { getAdminDb } from "./firebase-admin";
import { mapAdminListing, mapBidActivity } from "./firestore-mappers";

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

export async function getAdminDashboard(
  now = new Date(),
): Promise<AdminDashboardData> {
  await requireAdminSession();

  const db = getAdminDb();
  const { weekId, nextResetAt } = getUtcWeekBounds(now);
  const boardGeneration = await getBoardGeneration(weekId);
  const currentBids = db.collection("bids").where("weekId", "==", weekId);
  const allBids = db.collection("bids");

  const [
    currentAggregation,
    allTimeAggregation,
    listingsSnapshot,
    recentBidsSnapshot,
    settings,
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
  ]);

  return {
    currentWeek: mapRevenueStats(
      currentAggregation.data() as Record<string, unknown>,
    ),
    allTime: mapRevenueStats(
      allTimeAggregation.data() as Record<string, unknown>,
    ),
    listings: listingsSnapshot.docs.map(mapAdminListing),
    recentBids: recentBidsSnapshot.docs.map(mapBidActivity),
    settings,
    weekId,
    nextResetAt: nextResetAt.toISOString(),
  };
}
