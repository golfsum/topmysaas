import "server-only";

import { randomUUID } from "node:crypto";

import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import { getDemoLeaderboard } from "@/lib/domain/demo";
import { findRank, getTopFive, rankListings } from "@/lib/domain/ranking";
import type {
  BoardSettings,
  LeaderboardSnapshot,
  PublicListing,
} from "@/lib/domain/types";
import { DEFAULT_BOARD_SETTINGS } from "@/lib/domain/types";
import { getPreviousWeekId, getUtcWeekBounds } from "@/lib/domain/week";

import { ApiError } from "./api-error";
import {
  BOARD_STATES_COLLECTION,
  getBoardGeneration,
  parseBoardGeneration,
} from "./board-state";
import { getAdminDb, isFirebaseAdminConfigured } from "./firebase-admin";
import { recordErrorEvent } from "./error-events";
import { mapPublicListing, parseBoardSettings } from "./firestore-mappers";

const SETTINGS_PATH = "settings/board";
const RESET_TRANSACTION_CONCURRENCY = 50;
const SCHEDULED_RESET_LEASE_MS = 10 * 60_000;

async function deactivateListingsStillOnBoard(
  listings: QueryDocumentSnapshot[],
  weekId: string,
  boardGeneration: number,
  resetAt: Timestamp,
): Promise<number> {
  const db = getAdminDb();
  let deactivatedCount = 0;

  for (
    let start = 0;
    start < listings.length;
    start += RESET_TRANSACTION_CONCURRENCY
  ) {
    const results = await Promise.all(
      listings
        .slice(start, start + RESET_TRANSACTION_CONCURRENCY)
        .map((listing) =>
          db.runTransaction(async (transaction) => {
            const current = await transaction.get(listing.ref);
            if (
              !current.exists ||
              current.get("weekId") !== weekId ||
              Number(current.get("boardGeneration") ?? -1) !==
                boardGeneration ||
              current.get("isActive") !== true
            ) {
              return false;
            }

            transaction.update(listing.ref, {
              isActive: false,
              resetAt,
              updatedAt: FieldValue.serverTimestamp(),
            });
            return true;
          }),
        ),
    );
    deactivatedCount += results.filter(Boolean).length;
  }

  return deactivatedCount;
}

export function unavailableLeaderboardSnapshot(
  now = new Date(),
): LeaderboardSnapshot {
  const { weekId, nextResetAt } = getUtcWeekBounds(now);
  return {
    listings: [],
    settings: { ...DEFAULT_BOARD_SETTINGS },
    weekId,
    nextResetAt: nextResetAt.toISOString(),
    generatedAt: now.toISOString(),
    source: "unavailable",
  };
}

export async function getBoardSettings(): Promise<BoardSettings> {
  if (!isFirebaseAdminConfigured()) return { ...DEFAULT_BOARD_SETTINGS };

  const snapshot = await getAdminDb().doc(SETTINGS_PATH).get();
  return snapshot.exists
    ? parseBoardSettings(snapshot.data())
    : { ...DEFAULT_BOARD_SETTINGS };
}

export async function getLeaderboardSnapshot(
  now = new Date(),
): Promise<LeaderboardSnapshot> {
  if (process.env.DEMO_MODE === "true") return getDemoLeaderboard(now);
  if (!isFirebaseAdminConfigured()) return unavailableLeaderboardSnapshot(now);

  const { weekId, nextResetAt } = getUtcWeekBounds(now);
  try {
    const db = getAdminDb();
    const [settings, boardGeneration] = await Promise.all([
      getBoardSettings(),
      getBoardGeneration(weekId),
    ]);
    const listingSnapshot = await db
      .collection("listings")
      .where("weekId", "==", weekId)
      .where("boardGeneration", "==", boardGeneration)
      .where("isActive", "==", true)
      .orderBy("bidAmountCents", "desc")
      .orderBy("createdAt", "asc")
      .get();

    return {
      listings: listingSnapshot.docs.map(mapPublicListing),
      settings,
      weekId,
      nextResetAt: nextResetAt.toISOString(),
      generatedAt: now.toISOString(),
      source: "firestore",
    };
  } catch {
    await recordErrorEvent({
      category: "leaderboard",
      severity: "critical",
      code: "LEADERBOARD_LOAD_FAILED",
      operation: "load_public_leaderboard",
      message:
        "The public leaderboard could not be loaded from Firestore and returned an unavailable state.",
      actionRequired: true,
      retryable: true,
      weekId,
      dedupeKey: `leaderboard:${weekId}:load-failed`,
    });
    return unavailableLeaderboardSnapshot(now);
  }
}

export async function getPublicListingById(
  listingId: string,
): Promise<PublicListing | undefined> {
  const snapshot = await getAdminDb().collection("listings").doc(listingId).get();
  return snapshot.exists ? mapPublicListing(snapshot) : undefined;
}

export async function getListingRank(
  listingId: string,
  now = new Date(),
): Promise<number | null> {
  const { weekId } = getUtcWeekBounds(now);
  const boardGeneration = await getBoardGeneration(weekId);
  const snapshot = await getAdminDb()
    .collection("listings")
    .where("weekId", "==", weekId)
    .where("boardGeneration", "==", boardGeneration)
    .where("isActive", "==", true)
    .orderBy("bidAmountCents", "desc")
    .orderBy("createdAt", "asc")
    .get();
  return findRank(snapshot.docs.map(mapPublicListing), listingId);
}

export type ResetResult = {
  resetId: string | null;
  deactivatedCount: number;
};

export type ScheduledResetResult = ResetResult & {
  weekId: string;
  status: "completed" | "already-complete" | "in-progress";
};

export async function resetCurrentBoard(
  reason: "manual" | "scheduled" = "manual",
  now = new Date(),
): Promise<ResetResult> {
  const db = getAdminDb();
  const { weekId } = getUtcWeekBounds(now);
  const resetAt = Timestamp.fromDate(now);
  const stateRef = db.collection(BOARD_STATES_COLLECTION).doc(weekId);
  const previousGeneration = await db.runTransaction(async (transaction) => {
    const stateSnapshot = await transaction.get(stateRef);
    const currentGeneration = parseBoardGeneration(stateSnapshot.data());
    transaction.set(
      stateRef,
      {
        generation: currentGeneration + 1,
        lastResetAt: resetAt,
        lastResetReason: reason,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return currentGeneration;
  });

  const activeSnapshot = await db
    .collection("listings")
    .where("weekId", "==", weekId)
    .where("boardGeneration", "==", previousGeneration)
    .where("isActive", "==", true)
    .get();

  const ranked = rankListings(activeSnapshot.docs.map(mapPublicListing));
  const topFive = getTopFive(ranked);
  const resetId = `${reason}-${weekId}-g${previousGeneration}`;
  const resetRef = db.collection("resets").doc(resetId);
  await db.collection("archives").doc(resetId).set(
    {
      resetId,
      reason,
      weekId,
      boardGeneration: previousGeneration,
      listings: topFive,
      archivedAt: resetAt,
    },
    { merge: true },
  );

  const deactivatedCount = await deactivateListingsStillOnBoard(
    activeSnapshot.docs,
    weekId,
    previousGeneration,
    resetAt,
  );

  await resetRef.set({
    status: "complete",
    reason,
    weekId,
    boardGeneration: previousGeneration,
    deactivatedCount,
    completedAt: FieldValue.serverTimestamp(),
  });

  return { resetId, deactivatedCount };
}

export async function resetPreviousBoardOnSchedule(
  scheduledAt = new Date(),
): Promise<ScheduledResetResult> {
  const db = getAdminDb();
  const { startsAt: boundaryAt } = getUtcWeekBounds(scheduledAt);
  const weekId = getPreviousWeekId(boundaryAt);
  const resetId = `weekly-${weekId}`;
  const resetRef = db.collection("resets").doc(resetId);
  const stateRef = db.collection(BOARD_STATES_COLLECTION).doc(weekId);
  const attemptId = randomUUID();
  const attemptAt = Timestamp.fromDate(scheduledAt);
  const resetAt = Timestamp.fromDate(boundaryAt);
  const leaseExpiresAt = Timestamp.fromMillis(
    scheduledAt.getTime() + SCHEDULED_RESET_LEASE_MS,
  );

  const lease = await db.runTransaction(async (transaction) => {
    const existingReset = await transaction.get(resetRef);
    if (
      existingReset.exists &&
      existingReset.get("status") === "complete"
    ) {
      return { status: "already-complete" as const };
    }

    const existingLease = existingReset.get("leaseExpiresAt");
    if (
      existingReset.exists &&
      existingReset.get("status") === "running" &&
      existingLease instanceof Timestamp &&
      existingLease.toMillis() > scheduledAt.getTime()
    ) {
      return { status: "in-progress" as const };
    }

    const existingGeneration = existingReset.get("boardGeneration");
    if (
      existingReset.exists &&
      typeof existingGeneration === "number" &&
      Number.isSafeInteger(existingGeneration) &&
      existingGeneration >= 0
    ) {
      transaction.set(
        resetRef,
        {
          status: "running",
          attemptId,
          leaseExpiresAt,
          lastAttemptAt: attemptAt,
        },
        { merge: true },
      );
      return {
        status: "acquired" as const,
        boardGeneration: existingGeneration,
      };
    }

    const stateSnapshot = await transaction.get(stateRef);
    const currentGeneration = parseBoardGeneration(stateSnapshot.data());
    transaction.set(
      stateRef,
      {
        generation: currentGeneration + 1,
        lastResetAt: resetAt,
        lastResetReason: "scheduled",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      resetRef,
      {
        status: "running",
        reason: "scheduled",
        weekId,
        boardGeneration: currentGeneration,
        attemptId,
        leaseExpiresAt,
        scheduledAt: resetAt,
        startedAt: attemptAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return {
      status: "acquired" as const,
      boardGeneration: currentGeneration,
    };
  });

  if (lease.status !== "acquired") {
    return {
      resetId,
      weekId,
      status: lease.status,
      deactivatedCount: 0,
    };
  }

  try {
    const activeSnapshot = await db
      .collection("listings")
      .where("weekId", "==", weekId)
      .where("boardGeneration", "==", lease.boardGeneration)
      .where("isActive", "==", true)
      .get();
    const ranked = rankListings(activeSnapshot.docs.map(mapPublicListing));
    const archiveRef = db.collection("archives").doc(resetId);
    const archiveSnapshot = await archiveRef.get();
    if (!archiveSnapshot.exists) {
      await archiveRef.create({
        resetId,
        reason: "scheduled",
        weekId,
        boardGeneration: lease.boardGeneration,
        listings: getTopFive(ranked),
        archivedAt: resetAt,
      });
    }

    const deactivatedCount = await deactivateListingsStillOnBoard(
      activeSnapshot.docs,
      weekId,
      lease.boardGeneration,
      resetAt,
    );

    await db.runTransaction(async (transaction) => {
      const currentReset = await transaction.get(resetRef);
      if (currentReset.get("attemptId") !== attemptId) {
        throw new Error("The scheduled reset lease changed before completion.");
      }
      transaction.set(
        resetRef,
        {
          status: "complete",
          deactivatedCount,
          completedAt: FieldValue.serverTimestamp(),
          leaseExpiresAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    return {
      resetId,
      weekId,
      status: "completed",
      deactivatedCount,
    };
  } catch (error) {
    await db
      .runTransaction(async (transaction) => {
        const currentReset = await transaction.get(resetRef);
        if (currentReset.get("attemptId") !== attemptId) return;
        transaction.set(
          resetRef,
          {
            status: "failed",
            failedAt: FieldValue.serverTimestamp(),
            leaseExpiresAt: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      })
      .catch(() => undefined);
    throw error;
  }
}

export function requireFirebaseConfiguration(): void {
  if (!isFirebaseAdminConfigured()) {
    throw new ApiError(
      503,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured for this environment.",
    );
  }
}
