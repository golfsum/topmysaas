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
const INITIAL_BOARD_START_MS = Date.parse("2026-08-17T00:00:00.000Z");
const INITIAL_LAUNCH_MS = Date.parse("2026-08-24T00:00:00.000Z");
const INITIAL_LIVE_WEEK_END_MS = Date.parse("2026-08-31T00:00:00.000Z");
const INITIAL_BOARD_WEEK_ID = "2026-08-17";
const RESET_TRANSACTION_CONCURRENCY = 50;

function isInitialExtendedBoardPeriod(now: Date): boolean {
  return (
    now.getTime() >= INITIAL_BOARD_START_MS &&
    now.getTime() < INITIAL_LIVE_WEEK_END_MS
  );
}

function isInitialLaunchTransition(now: Date): boolean {
  return (
    now.getTime() >= INITIAL_LAUNCH_MS &&
    now.getTime() < INITIAL_LAUNCH_MS + DAY_MS
  );
}

function utcWeekId(now: Date): string {
  if (isInitialExtendedBoardPeriod(now)) return INITIAL_BOARD_WEEK_ID;

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

async function deactivateListingsStillOnBoard(
  listings: QueryDocumentSnapshot<DocumentData>[],
  weekId: string,
  generation: number,
  resetAt: Timestamp,
): Promise<number> {
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
              Number(current.get("boardGeneration") ?? -1) !== generation ||
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

    if (isInitialLaunchTransition(scheduledAt)) {
      await db.collection("launchTransitions").doc("initial-public-launch").set(
        {
          status: "complete",
          launchAt: Timestamp.fromMillis(INITIAL_LAUNCH_MS),
          retainedWeekId: INITIAL_BOARD_WEEK_ID,
          firstClearingResetAt: Timestamp.fromMillis(INITIAL_LIVE_WEEK_END_MS),
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      logger.info(
        "Initial public launch retained the pre-launch board until the next weekly reset",
        {
          retainedWeekId: INITIAL_BOARD_WEEK_ID,
          firstClearingResetAt: new Date(
            INITIAL_LIVE_WEEK_END_MS,
          ).toISOString(),
        },
      );
      return;
    }

    const weekId = previousWeekId(scheduledAt);
    const resetId = `weekly-${weekId}`;
    const resetRef = db.collection("resets").doc(resetId);
    const stateRef = db.collection("boardStates").doc(weekId);

    try {
      const previousGeneration = await db.runTransaction(
        async (transaction) => {
          const existingReset = await transaction.get(resetRef);
          if (
            existingReset.exists &&
            existingReset.get("status") === "complete"
          ) {
            return null;
          }
          if (
            existingReset.exists &&
            (existingReset.get("status") === "running" ||
              existingReset.get("status") === "failed") &&
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
        },
      );

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

      const deactivatedCount = await deactivateListingsStillOnBoard(
        activeSnapshot.docs,
        weekId,
        previousGeneration,
        Timestamp.fromDate(scheduledAt),
      );

      await resetRef.set({
        status: "complete",
        reason: "scheduled",
        weekId,
        boardGeneration: previousGeneration,
        deactivatedCount,
        completedAt: FieldValue.serverTimestamp(),
      });

      logger.info("Weekly board reset completed", {
        resetId,
        deactivatedCount,
      });
    } catch (error) {
      const failedAt = Timestamp.now();
      const environment =
        process.env.FUNCTIONS_EMULATOR === "true"
          ? "development"
          : "production";
      const errorRef = db
        .collection("systemEnvironments")
        .doc(environment)
        .collection("errorEvents")
        .doc(`scheduled-reset-${weekId}`);
      await Promise.allSettled([
        resetRef.set(
          {
            status: "failed",
            reason: "scheduled",
            weekId,
            failedAt,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
        db.runTransaction(async (transaction) => {
          const existing = await transaction.get(errorRef);
          transaction.set(
            errorRef,
            {
              category: "system",
              severity: "critical",
              status: "open",
              code: "WEEKLY_BOARD_RESET_FAILED",
              operation: "weekly_board_reset",
              message:
                "The scheduled weekly board reset failed before completion.",
              actionRequired: true,
              retryable: true,
              occurrenceCount: existing.exists ? FieldValue.increment(1) : 1,
              firstOccurredAt: existing.exists
                ? existing.get("firstOccurredAt") || failedAt
                : failedAt,
              lastOccurredAt: failedAt,
              expiresAt: Timestamp.fromMillis(
                failedAt.toMillis() + 90 * DAY_MS,
              ),
              environment,
              weekId,
              ...(existing.exists
                ? { resolvedAt: FieldValue.delete() }
                : {}),
            },
            { merge: true },
          );
        }),
      ]);
      logger.error("Weekly board reset failed", {
        resetId,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      throw error;
    }
  },
);
