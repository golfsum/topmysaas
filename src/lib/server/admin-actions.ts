import "server-only";

import { createHash } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { normalizeWebsiteUrl } from "@/lib/domain/url";
import {
  adminListingInputSchema,
  boardSettingsSchema,
} from "@/lib/domain/validation";
import { getUtcWeekBounds } from "@/lib/domain/week";

import { ApiError } from "./api-error";
import { getBoardGeneration } from "./board-state";
import { resetCurrentBoard } from "./board-data";
import type { ListingDocument } from "./documents";
import { getAdminDb } from "./firebase-admin";
import { listingTombstoneId } from "./listing-identity";

const documentIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^/]+$/, "Listing ID is invalid.");

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createListing"), listing: adminListingInputSchema }),
  z.object({
    action: z.literal("updateListing"),
    id: documentIdSchema,
    listing: adminListingInputSchema,
  }),
  z.object({
    action: z.literal("setVisibility"),
    id: documentIdSchema,
    isActive: z.boolean(),
  }),
  z.object({ action: z.literal("deleteListing"), id: documentIdSchema }),
  z.object({ action: z.literal("resetBoard") }),
  z.object({
    action: z.literal("updateSettings"),
    settings: boardSettingsSchema,
  }),
]);

function adminListingId(normalizedUrl: string): string {
  return `admin-${createHash("sha256")
    .update(normalizedUrl)
    .digest("hex")
    .slice(0, 32)}`;
}

function normalizeAdminUrl(url: string): ReturnType<typeof normalizeWebsiteUrl> {
  try {
    return normalizeWebsiteUrl(url);
  } catch (error) {
    throw new ApiError(
      400,
      "INVALID_WEBSITE_URL",
      error instanceof Error ? error.message : "Enter a valid HTTPS website URL.",
    );
  }
}

export async function performAdminAction(body: unknown): Promise<unknown> {
  const input = adminActionSchema.parse(body);
  const db = getAdminDb();

  switch (input.action) {
    case "createListing": {
      const now = Timestamp.now();
      const { weekId } = getUtcWeekBounds(now.toDate());
      const boardGeneration = await getBoardGeneration(weekId);
      const website = normalizeAdminUrl(input.listing.url);
      const matching = await db
        .collection("listings")
        .where("normalizedUrl", "==", website.normalizedUrl)
        .where("weekId", "==", weekId)
        .where("boardGeneration", "==", boardGeneration)
        .limit(1)
        .get();
      if (!matching.empty) {
        throw new ApiError(
          409,
          "LISTING_ALREADY_EXISTS",
          "A listing for this URL already exists on the current board.",
        );
      }

      const listingId = adminListingId(website.normalizedUrl);
      const listing: ListingDocument = {
        name: input.listing.name,
        url: website.url,
        normalizedUrl: website.normalizedUrl,
        description: input.listing.description,
        bidAmountCents: input.listing.bidAmountCents,
        bidAmount: input.listing.bidAmountCents / 100,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        weekId,
        boardGeneration,
        source: "admin",
      };
      const batch = db.batch();
      batch.set(db.collection("listings").doc(listingId), listing);
      batch.delete(
        db
          .collection("listingTombstones")
          .doc(listingTombstoneId(weekId, website.normalizedUrl)),
      );
      await batch.commit();
      return { ok: true, listingId };
    }

    case "updateListing": {
      const ref = db.collection("listings").doc(input.id);
      const existing = await ref.get();
      if (!existing.exists) {
        throw new ApiError(404, "LISTING_NOT_FOUND", "Listing not found.");
      }
      const website = normalizeAdminUrl(input.listing.url);
      const existingData = existing.data() as ListingDocument;
      const matching = await db
        .collection("listings")
        .where("normalizedUrl", "==", website.normalizedUrl)
        .where("weekId", "==", existingData.weekId)
        .where(
          "boardGeneration",
          "==",
          Number(existingData.boardGeneration ?? 0),
        )
        .limit(2)
        .get();
      if (matching.docs.some((snapshot) => snapshot.id !== input.id)) {
        throw new ApiError(
          409,
          "LISTING_ALREADY_EXISTS",
          "Another listing for this URL already exists on the current board.",
        );
      }
      await ref.update({
        name: input.listing.name,
        url: website.url,
        normalizedUrl: website.normalizedUrl,
        description: input.listing.description,
        bidAmountCents: input.listing.bidAmountCents,
        bidAmount: input.listing.bidAmountCents / 100,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true, listingId: input.id };
    }

    case "setVisibility": {
      const ref = db.collection("listings").doc(input.id);
      const existing = await ref.get();
      if (!existing.exists) {
        throw new ApiError(404, "LISTING_NOT_FOUND", "Listing not found.");
      }
      await ref.update({
        isActive: input.isActive,
        hiddenReason: input.isActive
          ? FieldValue.delete()
          : "Hidden by administrator",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ok: true, listingId: input.id, isActive: input.isActive };
    }

    case "deleteListing": {
      const ref = db.collection("listings").doc(input.id);
      const existing = await ref.get();
      if (!existing.exists) {
        throw new ApiError(404, "LISTING_NOT_FOUND", "Listing not found.");
      }
      const existingData = existing.data() as ListingDocument;
      const tombstoneRef = db
        .collection("listingTombstones")
        .doc(
          listingTombstoneId(
            existingData.weekId,
            existingData.normalizedUrl,
          ),
        );
      await db.runTransaction(async (transaction) => {
        transaction.set(tombstoneRef, {
          listingId: input.id,
          normalizedUrl: existingData.normalizedUrl,
          weekId: existingData.weekId,
          boardGeneration: Number(existingData.boardGeneration ?? 0),
          expiresAt: Timestamp.fromDate(
            getUtcWeekBounds(new Date()).nextResetAt,
          ),
          deletedAt: FieldValue.serverTimestamp(),
        });
        transaction.delete(ref);
      });
      return { ok: true, listingId: input.id };
    }

    case "resetBoard":
      return { ok: true, ...(await resetCurrentBoard("manual")) };

    case "updateSettings":
      await db.doc("settings/board").set(input.settings, { merge: true });
      return { ok: true, settings: input.settings };
  }
}
