import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { normalizeWebsiteUrl } from "@/lib/domain/url";
import { getUtcWeekBounds } from "@/lib/domain/week";

import { getBoardGeneration } from "./board-state";
import { recordErrorEvent } from "./error-events";
import { getAdminDb } from "./firebase-admin";
import { boardPeriodId, listingIdForUrl } from "./listing-identity";

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export async function recordPublicListingClick(
  listingId: string,
  now = new Date(),
): Promise<string | null> {
  const db = getAdminDb();
  const listingSnapshot = await db.collection("listings").doc(listingId).get();
  if (!listingSnapshot.exists) return null;

  const listing = listingSnapshot.data() ?? {};
  const { weekId } = getUtcWeekBounds(now);
  const listingGeneration = nonNegativeInteger(listing.boardGeneration);
  const hiddenReason =
    typeof listing.hiddenReason === "string" ? listing.hiddenReason.trim() : "";

  if (
    listing.isActive !== true ||
    hiddenReason ||
    listing.weekId !== weekId ||
    listingGeneration === null ||
    typeof listing.url !== "string"
  ) {
    return null;
  }

  let website: ReturnType<typeof normalizeWebsiteUrl>;
  try {
    website = normalizeWebsiteUrl(listing.url);
  } catch {
    return null;
  }

  if (
    typeof listing.normalizedUrl === "string" &&
    listing.normalizedUrl !== website.normalizedUrl
  ) {
    return null;
  }

  const currentGeneration = await getBoardGeneration(weekId);
  if (listingGeneration !== currentGeneration) return null;

  const periodId = boardPeriodId(weekId, currentGeneration);
  const listingStatsId = listingIdForUrl(website.normalizedUrl);
  const timestamp = FieldValue.serverTimestamp();
  const increment = FieldValue.increment(1);
  const batch = db.batch();

  batch.set(
    db.collection("listingClickStats").doc(listingStatsId),
    {
      clickCount: increment,
      normalizedUrl: website.normalizedUrl,
      listingName:
        typeof listing.name === "string" ? listing.name : "Untitled product",
      lastListingId: listingSnapshot.id,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    db
      .collection("listingClickStats")
      .doc(listingStatsId)
      .collection("periods")
      .doc(periodId),
    {
      clickCount: increment,
      weekId,
      boardGeneration: currentGeneration,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    db.collection("boardClickStats").doc(periodId),
    {
      clickCount: increment,
      weekId,
      boardGeneration: currentGeneration,
      updatedAt: timestamp,
    },
    { merge: true },
  );

  try {
    await batch.commit();
  } catch {
    await recordErrorEvent({
      category: "firebase",
      severity: "warning",
      code: "LISTING_CLICK_WRITE_FAILED",
      operation: "record_outbound_listing_click",
      message:
        "A listing opened successfully, but its click counters could not be updated.",
      actionRequired: false,
      retryable: true,
      listingId,
      weekId,
      dedupeKey: `clicks:${periodId}:${listingId}:write-failed`,
    });
  }

  return website.url;
}
