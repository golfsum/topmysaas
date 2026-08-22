import { getApps, initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (getApps().length === 0) initializeApp();

const db = getFirestore();
const DAY_MS = 24 * 60 * 60 * 1_000;

function utcWeekId(now: Date): string {
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(midnight - daysSinceMonday * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function previousWeekId(now: Date): string {
  const currentWeekId = utcWeekId(now);
  const currentWeekStart = new Date(`${currentWeekId}T00:00:00.000Z`);
  return utcWeekId(new Date(currentWeekStart.getTime() - 1));
}

function timestampMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }
  return 0;
}

function boardGeneration(data: DocumentData | undefined): number {
  const value = data?.generation;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function publicArchiveListing(snapshot: QueryDocumentSnapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: typeof data.name === "string" ? data.name : "Untitled product",
    url: typeof data.url === "string" ? data.url : "",
    description: typeof data.description === "string" ? data.description : "",
    bidAmountCents:
      typeof data.bidAmountCents === "number" ? data.bidAmountCents : 0,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function rankDocuments(
  left: QueryDocumentSnapshot<DocumentData>,
  right: QueryDocumentSnapshot<DocumentData>,
): number {
  const leftData = left.data();
  const rightData = right.data();
  const byBid =
    Number(rightData.bidAmountCents ?? 0) - Number(leftData.bidAmountCents ?? 0);
  if (byBid !== 0) return byBid;
  const byCreated =
    timestampMillis(leftData.createdAt) - timestampMillis(rightData.createdAt);
  if (byCreated !== 0) return byCreated;
  return left.id.localeCompare(right.id);
}

export const weeklyBoardReset = onSchedule(
  {
    schedule: "0 0 * * 1",
    timeZone: "UTC",
    retryCount: 3,
    maxInstances: 1,
    timeoutSeconds: 300,
  },
  async (event) => {
    const eventTime = new Date(event.scheduleTime);
    const scheduledAt = Number.isNaN(eventTime.getTime()) ? new Date() : eventTime;
    const weekId = previousWeekId(scheduledAt);
    const resetId = `weekly-${weekId}`;
    const resetRef = db.collection("resets").doc(resetId);
    const stateRef = db.collection("boardStates").doc(weekId);
    const previousGeneration = await db.runTransaction(async (transaction) => {
      const existingReset = await transaction.get(resetRef);
      if (existingReset.exists && existingReset.get("status") === "complete") {
        return null;
      }
      if (
        existingReset.exists &&
        existingReset.get("status") === "running" &&
        typeof existingReset.get("boardGeneration") === "number"
      ) {
        return Number(existingReset.get("boardGeneration"));
      }

      const stateSnapshot = await transaction.get(stateRef);
      const currentGeneration = boardGeneration(stateSnapshot.data());
      transaction.set(
        stateRef,
        {
          generation: currentGeneration + 1,
          lastResetAt: Timestamp.fromDate(scheduledAt),
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
          startedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return currentGeneration;
    });

    if (previousGeneration === null) {
      logger.info("Weekly board reset already completed", { resetId });
      return;
    }

    const activeSnapshot = await db
      .collection("listings")
      .where("weekId", "==", weekId)
      .where("boardGeneration", "==", previousGeneration)
      .where("isActive", "==", true)
      .get();
    const ranked = [...activeSnapshot.docs].sort(rankDocuments);
    const archiveRef = db.collection("archives").doc(resetId);
    const archiveSnapshot = await archiveRef.get();
    if (!archiveSnapshot.exists) {
      await archiveRef.create({
        resetId,
        reason: "scheduled",
        weekId,
        boardGeneration: previousGeneration,
        listings: ranked.slice(0, 5).map(publicArchiveListing),
        archivedAt: Timestamp.fromDate(scheduledAt),
      });
    }

    const writer = db.bulkWriter();
    for (const listing of activeSnapshot.docs) {
      writer.update(listing.ref, {
        isActive: false,
        resetAt: Timestamp.fromDate(scheduledAt),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await writer.close();

    await resetRef.set({
      status: "complete",
      reason: "scheduled",
      weekId,
      boardGeneration: previousGeneration,
      deactivatedCount: activeSnapshot.size,
      completedAt: FieldValue.serverTimestamp(),
    });

    logger.info("Weekly board reset completed", {
      resetId,
      deactivatedCount: activeSnapshot.size,
    });
  },
);
