import "server-only";

import { randomUUID } from "node:crypto";

import {
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";
import type Stripe from "stripe";

import { listingOwnershipMatches } from "@/lib/domain/listing-ownership";
import { calculateChargeCents } from "@/lib/domain/money";
import { removalBarrierAllowsIntent } from "@/lib/domain/removal-barrier";
import { minimumTotalForTargetRank } from "@/lib/domain/ranking";
import type {
  BidStatusResponse,
  CheckoutResponse,
  PublicListing,
} from "@/lib/domain/types";
import { normalizeWebsiteUrl } from "@/lib/domain/url";
import { checkoutRequestSchema } from "@/lib/domain/validation";
import { getUtcWeekBounds, isCheckoutWindowOpen } from "@/lib/domain/week";

import { ApiError } from "./api-error";
import {
  BOARD_STATES_COLLECTION,
  parseBoardGeneration,
} from "./board-state";
import {
  getBoardSettings,
  getListingRank,
  getPublicListingById,
  requireFirebaseConfiguration,
} from "./board-data";
import type {
  BidDocument,
  BidIntentDocument,
  BidIntentStatus,
  CheckoutSessionDocument,
  ListingDocument,
} from "./documents";
import { getAdminDb } from "./firebase-admin";
import { listingIdForUrl, listingTombstoneId } from "./listing-identity";
import { getStripe } from "./stripe";

type CheckoutCreationResult = CheckoutResponse & { ownerToken: string };

type ExistingListing = {
  id: string;
  data: DocumentData;
};

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

function chooseExistingListing(
  docs: QueryDocumentSnapshot[],
  weekId: string,
  boardGeneration: number,
): ExistingListing | undefined {
  return docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .sort((left, right) => {
      const leftCurrent =
        left.data.weekId === weekId &&
        Number(left.data.boardGeneration ?? 0) === boardGeneration
          ? 1
          : 0;
      const rightCurrent =
        right.data.weekId === weekId &&
        Number(right.data.boardGeneration ?? 0) === boardGeneration
          ? 1
          : 0;
      if (leftCurrent !== rightCurrent) return rightCurrent - leftCurrent;
      return timestampMillis(right.data.updatedAt) - timestampMillis(left.data.updatedAt);
    })[0];
}

function appOrigin(fallbackOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(
      503,
      "SITE_URL_NOT_CONFIGURED",
      "The production site URL is not configured.",
    );
  }
  return new URL(fallbackOrigin).origin;
}

async function findListingInTransaction(
  transaction: Transaction,
  normalizedUrl: string,
  weekId: string,
  boardGeneration: number,
): Promise<ExistingListing | undefined> {
  const query = getAdminDb()
    .collection("listings")
    .where("normalizedUrl", "==", normalizedUrl)
    .limit(10);
  const snapshot = await transaction.get(query);
  return chooseExistingListing(snapshot.docs, weekId, boardGeneration);
}

async function findTargetRankOccupantInTransaction(
  transaction: Transaction,
  weekId: string,
  boardGeneration: number,
  targetRank: number,
): Promise<QueryDocumentSnapshot | undefined> {
  const query = getAdminDb()
    .collection("listings")
    .where("weekId", "==", weekId)
    .where("boardGeneration", "==", boardGeneration)
    .where("isActive", "==", true)
    .orderBy("bidAmountCents", "desc")
    .orderBy("createdAt", "asc")
    .limit(targetRank);
  const snapshot = await transaction.get(query);
  return snapshot.docs[targetRank - 1];
}

export async function createCheckout(
  requestBody: unknown,
  ownerToken: string,
  ownerTokenHash: string,
  requestOrigin: string,
  rateLimitKey?: string,
  now = new Date(),
): Promise<CheckoutCreationResult> {
  if (process.env.DEMO_MODE === "true") {
    throw new ApiError(
      503,
      "DEMO_CHECKOUT_DISABLED",
      "Checkout is disabled while preview data is active.",
    );
  }
  requireFirebaseConfiguration();
  const input = checkoutRequestSchema.parse(requestBody);
  const settings = await getBoardSettings();
  const { weekId, nextResetAt } = getUtcWeekBounds(now);

  if (!isCheckoutWindowOpen(now, settings.checkoutCloseMinutes)) {
    throw new ApiError(
      409,
      "CHECKOUT_CLOSED_FOR_RESET",
      "Bidding is paused briefly while the board resets. Try again after 00:00 UTC.",
    );
  }

  let normalizedWebsite: ReturnType<typeof normalizeWebsiteUrl>;
  try {
    normalizedWebsite = normalizeWebsiteUrl(input.url);
  } catch (error) {
    throw new ApiError(
      400,
      "INVALID_WEBSITE_URL",
      error instanceof Error ? error.message : "Enter a valid HTTPS website URL.",
    );
  }

  const db = getAdminDb();
  const intentId = randomUUID();
  const legacyTombstoneRemovalId = randomUUID();
  const intentRef = db.collection("bidIntents").doc(intentId);
  const createdAt = Timestamp.fromDate(now);
  const stateRef = db.collection(BOARD_STATES_COLLECTION).doc(weekId);
  const publicListingId = listingIdForUrl(normalizedWebsite.normalizedUrl);
  const tombstoneRef = db
    .collection("listingTombstones")
    .doc(listingTombstoneId(weekId, normalizedWebsite.normalizedUrl));
  const claimRef = db
    .collection("listingClaims")
    .doc(listingTombstoneId(weekId, normalizedWebsite.normalizedUrl));
  const rateLimitRef = rateLimitKey
    ? db.collection("checkoutRateLimits").doc(rateLimitKey)
    : null;

  const prepared = await db.runTransaction(async (transaction) => {
    const [
      stateSnapshot,
      tombstoneSnapshot,
      claimSnapshot,
      rateLimitSnapshot,
    ] =
      await Promise.all([
        transaction.get(stateRef),
        transaction.get(tombstoneRef),
        transaction.get(claimRef),
        rateLimitRef ? transaction.get(rateLimitRef) : Promise.resolve(null),
      ]);
    const boardGeneration = parseBoardGeneration(stateSnapshot.data());

    const existingRemovalId = tombstoneSnapshot.get("removalId");
    const acceptedRemovalId = tombstoneSnapshot.exists
      ? typeof existingRemovalId === "string" && existingRemovalId.length > 0
        ? existingRemovalId
        : legacyTombstoneRemovalId
      : undefined;
    const activeClaim =
      claimSnapshot.exists &&
      Number(claimSnapshot.get("boardGeneration") ?? -1) ===
        boardGeneration &&
      timestampMillis(claimSnapshot.get("expiresAt")) > now.getTime();
    if (activeClaim) {
      const ownedByRequester =
        claimSnapshot.get("ownerTokenHash") === ownerTokenHash;
      throw new ApiError(
        409,
        "LISTING_CHECKOUT_IN_PROGRESS",
        ownedByRequester
          ? "A checkout for this listing is already open. Finish it or try again after it expires."
          : "Another checkout for this listing is already in progress. Try again later.",
      );
    }

    if (rateLimitSnapshot?.exists) {
      const windowStartedAt = timestampMillis(
        rateLimitSnapshot.get("windowStartedAt"),
      );
      const count = Number(rateLimitSnapshot.get("count") ?? 0);
      if (now.getTime() - windowStartedAt < 10 * 60_000 && count >= 5) {
        throw new ApiError(
          429,
          "CHECKOUT_RATE_LIMITED",
          "Too many checkout attempts were started. Try again in a few minutes.",
        );
      }
    }

    const existing = await findListingInTransaction(
      transaction,
      normalizedWebsite.normalizedUrl,
      weekId,
      boardGeneration,
    );
    const targetRankOccupant = input.targetRank
      ? await findTargetRankOccupantInTransaction(
          transaction,
          weekId,
          boardGeneration,
          input.targetRank,
        )
      : undefined;
    const existingData = existing?.data;

    if (typeof existingData?.hiddenReason === "string") {
      throw new ApiError(
        403,
        "LISTING_HIDDEN",
        "This listing cannot accept bids. Contact the site administrator.",
      );
    }

    const existingOwnerHash =
      typeof existingData?.ownerTokenHash === "string"
        ? existingData.ownerTokenHash
        : undefined;
    if (!listingOwnershipMatches(existingOwnerHash, ownerTokenHash)) {
      throw new ApiError(
        403,
        "LISTING_OWNED_ON_ANOTHER_DEVICE",
        "This listing is managed on another device. Cross-device recovery is not available.",
      );
    }

    const belongsToCurrentBoard =
      existingData?.weekId === weekId &&
      Number(existingData?.boardGeneration ?? 0) === boardGeneration &&
      existingData?.isActive === true;
    const currentTotalCents = belongsToCurrentBoard
      ? Number(existingData?.bidAmountCents ?? 0)
      : 0;
    const requiredForOwnListingCents =
      currentTotalCents > 0
        ? Math.max(
            settings.minBidCents,
            currentTotalCents + settings.minIncrementCents,
          )
        : settings.minBidCents;
    const requiredForTargetRankCents = minimumTotalForTargetRank(
      targetRankOccupant
        ? Number(targetRankOccupant.get("bidAmountCents") ?? 0)
        : undefined,
      settings.minBidCents,
      settings.minIncrementCents,
    );
    const requiredTargetCents = Math.max(
      requiredForOwnListingCents,
      requiredForTargetRankCents,
    );

    if (input.targetTotalCents < requiredTargetCents) {
      const targetRankMoved = Boolean(
        input.targetRank &&
          input.targetTotalCents < requiredForTargetRankCents,
      );
      throw new ApiError(
        targetRankMoved ? 409 : 400,
        targetRankMoved ? "TARGET_RANK_MOVED" : "BID_TOO_LOW",
        targetRankMoved
          ? `Rank #${input.targetRank} moved. Its new minimum is $${(requiredTargetCents / 100).toFixed(2)}.`
          : `The new total must be at least $${(requiredTargetCents / 100).toFixed(2)}.`,
        {
          requiredTargetCents,
          currentTotalCents,
          ...(input.targetRank
            ? {
                targetRank: input.targetRank,
                currentOccupantId: targetRankOccupant?.id ?? null,
              }
            : {}),
        },
      );
    }

    const amountDueCents = calculateChargeCents(
      currentTotalCents,
      input.targetTotalCents,
    );
    if (amountDueCents <= 0) {
      throw new ApiError(
        400,
        "BID_NOT_RAISED",
        "The new total must be higher than the current total.",
      );
    }

    const listingId =
      existing?.id ?? publicListingId;
    const intent: BidIntentDocument = {
      listingId,
      name: input.name,
      url: normalizedWebsite.url,
      normalizedUrl: normalizedWebsite.normalizedUrl,
      description: input.description,
      ownerTokenHash,
      ...(acceptedRemovalId ? { acceptedRemovalId } : {}),
      weekId,
      boardGeneration,
      targetTotalCents: input.targetTotalCents,
      ...(input.targetRank ? { targetRank: input.targetRank } : {}),
      requiredTargetCentsAtCreation: requiredTargetCents,
      baseTotalCents: currentTotalCents,
      amountDueCents,
      startsNewPeriod: !belongsToCurrentBoard,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    };
    if (
      tombstoneSnapshot.exists &&
      acceptedRemovalId === legacyTombstoneRemovalId
    ) {
      transaction.set(
        tombstoneRef,
        { removalId: acceptedRemovalId, updatedAt: createdAt },
        { merge: true },
      );
    }
    transaction.create(intentRef, intent);
    transaction.set(claimRef, {
      intentId,
      ownerTokenHash,
      normalizedUrl: normalizedWebsite.normalizedUrl,
      weekId,
      boardGeneration,
      expiresAt: Timestamp.fromMillis(
        Math.min(nextResetAt.getTime(), now.getTime() + 24 * 60 * 60_000),
      ),
      updatedAt: createdAt,
    });

    if (rateLimitRef) {
      const existingWindowStartedAt = rateLimitSnapshot?.exists
        ? timestampMillis(rateLimitSnapshot.get("windowStartedAt"))
        : 0;
      const withinWindow =
        now.getTime() - existingWindowStartedAt < 10 * 60_000;
      transaction.set(
        rateLimitRef,
        {
          windowStartedAt: withinWindow
            ? rateLimitSnapshot?.get("windowStartedAt")
            : createdAt,
          count: withinWindow
            ? Number(rateLimitSnapshot?.get("count") ?? 0) + 1
            : 1,
          expiresAt: Timestamp.fromMillis(now.getTime() + 24 * 60 * 60_000),
          updatedAt: createdAt,
        },
        { merge: true },
      );
    }

    return { intent, listingId, amountDueCents };
  });

  const releaseClaim = async () => {
    await db.runTransaction(async (transaction) => {
      const claimSnapshot = await transaction.get(claimRef);
      if (claimSnapshot.get("intentId") === intentId) {
        transaction.delete(claimRef);
      }
    });
  };

  const baseUrl = appOrigin(requestOrigin);
  const expiresInMs = nextResetAt.getTime() - now.getTime();
  const canExpireAtReset =
    expiresInMs >= 30 * 60_000 && expiresInMs <= 24 * 60 * 60_000;

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        // Weekly leaderboard placement is an advertising service, which is not
        // eligible for Stripe Managed Payments.
        managed_payments: { enabled: false },
        client_reference_id: intentId,
        metadata: {
          bidIntentId: intentId,
          listingId: prepared.listingId,
          weekId,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: settings.currency,
              unit_amount: prepared.amountDueCents,
              product_data: {
                name: `TopMySaaS weekly bid for ${input.name}`,
                description: `New target total: $${(
                  input.targetTotalCents / 100
                ).toFixed(2)}`,
              },
            },
          },
        ],
        success_url: `${baseUrl}/bid/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?checkout=cancelled`,
        ...(canExpireAtReset
          ? { expires_at: Math.floor(nextResetAt.getTime() / 1_000) }
          : {}),
      },
      { idempotencyKey: `bid-intent:${intentId}` },
    );
  } catch (error) {
    await releaseClaim().catch((claimError) =>
      console.error("Unable to release failed listing claim", claimError),
    );
    await intentRef
      .update({
        status: "failed",
        failureMessage: "Stripe Checkout could not be created.",
        updatedAt: Timestamp.now(),
      })
      .catch((updateError) =>
        console.error("Unable to mark failed bid intent", updateError),
      );
    console.error("Unable to create Stripe Checkout Session", error);
    throw new ApiError(
      502,
      "CHECKOUT_CREATE_FAILED",
      "Checkout could not be started. No payment was taken.",
    );
  }

  if (!session.url) {
    await releaseClaim().catch((claimError) =>
      console.error("Unable to release listing claim without a URL", claimError),
    );
    throw new ApiError(
      502,
      "CHECKOUT_URL_MISSING",
      "Stripe did not return a Checkout URL. No payment was taken.",
    );
  }

  const sessionRecord: CheckoutSessionDocument = {
    bidIntentId: intentId,
    listingId: prepared.listingId,
    weekId,
    status: "checkout_created",
    createdAt,
    updatedAt: Timestamp.now(),
  };
  try {
    await db.runTransaction(async (transaction) => {
      const claimSnapshot = await transaction.get(claimRef);
      transaction.set(db.collection("checkoutSessions").doc(session.id), sessionRecord);
      transaction.update(intentRef, {
        status: "checkout_created",
        stripeSessionId: session.id,
        updatedAt: Timestamp.now(),
      });
      if (claimSnapshot.get("intentId") === intentId) {
        transaction.set(
          claimRef,
          {
            expiresAt: Timestamp.fromMillis(session.expires_at * 1_000),
            stripeSessionId: session.id,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
      }
    });
  } catch (error) {
    // The signed webhook can recover from metadata even if this convenience write fails.
    console.error("Unable to persist Checkout Session mapping", error);
  }

  return {
    checkoutUrl: session.url,
    chargedTodayCents: prepared.amountDueCents,
    targetTotalCents: input.targetTotalCents,
    ownerToken,
  };
}

type FulfillmentResult = {
  listingId: string;
  resultingTotalCents: number;
  duplicate: boolean;
};

export async function fulfillCheckoutSession(
  sessionId: string,
  stripeEventId: string,
): Promise<FulfillmentResult | null> {
  requireFirebaseConfiguration();
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode !== "payment" || session.payment_status !== "paid") {
    return null;
  }

  const intentId = session.metadata?.bidIntentId;
  if (!intentId || !session.amount_total || session.currency !== "usd") {
    throw new Error(`Paid Checkout Session ${sessionId} is missing bid metadata.`);
  }

  const db = getAdminDb();
  const bidRef = db.collection("bids").doc(sessionId);
  const intentRef = db.collection("bidIntents").doc(intentId);
  const sessionRef = db.collection("checkoutSessions").doc(sessionId);
  const fulfilledAt = Timestamp.now();

  return db.runTransaction(async (transaction) => {
    const [existingBid, intentSnapshot] = await Promise.all([
      transaction.get(bidRef),
      transaction.get(intentRef),
    ]);

    if (existingBid.exists) {
      return {
        listingId: String(existingBid.get("listingId") ?? ""),
        resultingTotalCents: Number(
          existingBid.get("resultingTotalCents") ?? 0,
        ),
        duplicate: true,
      };
    }
    if (!intentSnapshot.exists) {
      throw new Error(`Bid intent ${intentId} does not exist.`);
    }

    const intent = intentSnapshot.data() as BidIntentDocument;
    if (
      intent.amountDueCents !== session.amount_total ||
      intent.listingId !== session.metadata?.listingId ||
      intent.weekId !== session.metadata?.weekId ||
      (intent.stripeSessionId && intent.stripeSessionId !== sessionId)
    ) {
      throw new Error(`Checkout Session ${sessionId} does not match its bid intent.`);
    }

    const listingRef = db.collection("listings").doc(intent.listingId);
    const stateRef = db
      .collection(BOARD_STATES_COLLECTION)
      .doc(intent.weekId);
    const tombstoneRef = db
      .collection("listingTombstones")
      .doc(listingTombstoneId(intent.weekId, intent.normalizedUrl));
    const claimRef = db
      .collection("listingClaims")
      .doc(listingTombstoneId(intent.weekId, intent.normalizedUrl));
    const [listingSnapshot, stateSnapshot, tombstoneSnapshot, claimSnapshot] =
      await Promise.all([
        transaction.get(listingRef),
        transaction.get(stateRef),
        transaction.get(tombstoneRef),
        transaction.get(claimRef),
      ]);
    const existing = listingSnapshot.exists
      ? (listingSnapshot.data() as ListingDocument)
      : undefined;
    const currentBoardGeneration = parseBoardGeneration(stateSnapshot.data());
    const sameBoard =
      existing?.weekId === intent.weekId &&
      Number(existing.boardGeneration ?? 0) === intent.boardGeneration;
    const removalAllowsPayment = removalBarrierAllowsIntent(
      tombstoneSnapshot.exists,
      tombstoneSnapshot.get("removalId"),
      intent.acceptedRemovalId,
    );
    const boardAcceptsPayment =
      currentBoardGeneration === intent.boardGeneration &&
      removalAllowsPayment;
    const startsNewPeriodNow =
      intent.startsNewPeriod &&
      (!existing || !sameBoard || existing.isActive !== true);
    const currentTotalCents =
      existing && sameBoard && !startsNewPeriodNow
        ? existing.bidAmountCents
        : intent.baseTotalCents;
    const resultingTotalCents = currentTotalCents + session.amount_total;
    const ownershipMatches = listingOwnershipMatches(
      existing?.ownerTokenHash,
      intent.ownerTokenHash,
    );
    const wasHiddenByAdmin = typeof existing?.hiddenReason === "string";
    const shouldActivate =
      boardAcceptsPayment &&
      (startsNewPeriodNow ? !wasHiddenByAdmin : (existing?.isActive ?? true));

    let listing: ListingDocument | undefined;
    if (
      ownershipMatches &&
      removalAllowsPayment &&
      (boardAcceptsPayment || sameBoard || !existing)
    ) {
      listing = {
        name: intent.name,
        url: intent.url,
        normalizedUrl: intent.normalizedUrl,
        description: intent.description,
        bidAmountCents: resultingTotalCents,
        bidAmount: resultingTotalCents / 100,
        createdAt:
          startsNewPeriodNow || !existing ? fulfilledAt : existing.createdAt,
        updatedAt: fulfilledAt,
        isActive: shouldActivate,
        weekId:
          startsNewPeriodNow || !existing ? intent.weekId : existing.weekId,
        boardGeneration:
          startsNewPeriodNow || !existing
            ? intent.boardGeneration
            : Number(existing.boardGeneration ?? intent.boardGeneration),
        ownerTokenHash: existing?.ownerTokenHash ?? intent.ownerTokenHash,
        ...(existing?.hiddenReason
          ? { hiddenReason: existing.hiddenReason }
          : {}),
        source: existing?.source ?? "checkout",
      };
    }

    const appliedToActiveBoard = Boolean(listing?.isActive);

    const bid: BidDocument = {
      listingId: intent.listingId,
      listingName: listing?.name ?? intent.name,
      amountCents: session.amount_total,
      amount: session.amount_total / 100,
      resultingTotalCents,
      createdAt: fulfilledAt,
      stripeSessionId: sessionId,
      stripeEventId,
      weekId: intent.weekId,
      appliedToActiveBoard,
    };

    if (listing) {
      transaction.set(listingRef, listing);
    }
    transaction.create(bidRef, bid);
    transaction.set(
      sessionRef,
      {
        bidIntentId: intentId,
        listingId: intent.listingId,
        weekId: intent.weekId,
        status: "fulfilled",
        createdAt: intent.createdAt,
        updatedAt: fulfilledAt,
      } satisfies CheckoutSessionDocument,
      { merge: true },
    );
    transaction.update(intentRef, {
      status: "fulfilled",
      stripeSessionId: sessionId,
      resultingTotalCents,
      fulfilledAt,
      updatedAt: fulfilledAt,
    });
    if (claimSnapshot.get("intentId") === intentId) {
      transaction.delete(claimRef);
    }

    return {
      listingId: intent.listingId,
      resultingTotalCents,
      duplicate: false,
    };
  });
}

export async function markCheckoutSession(
  session: Stripe.Checkout.Session,
  status: Extract<BidIntentStatus, "failed" | "expired">,
): Promise<void> {
  const intentId = session.metadata?.bidIntentId;
  if (!intentId || !isCheckoutSessionId(session.id)) return;

  const db = getAdminDb();
  const updatedAt = Timestamp.now();
  const intentRef = db.collection("bidIntents").doc(intentId);
  const sessionRef = db.collection("checkoutSessions").doc(session.id);
  await db.runTransaction(async (transaction) => {
    const intentSnapshot = await transaction.get(intentRef);
    const intent = intentSnapshot.exists
      ? (intentSnapshot.data() as BidIntentDocument)
      : undefined;
    const claimRef = intent
      ? db
          .collection("listingClaims")
          .doc(listingTombstoneId(intent.weekId, intent.normalizedUrl))
      : undefined;
    const claimSnapshot = claimRef
      ? await transaction.get(claimRef)
      : undefined;

    if (intent?.status === "fulfilled") return;

    transaction.set(
      sessionRef,
      {
        bidIntentId: intentId,
        listingId: session.metadata?.listingId ?? intent?.listingId ?? "",
        weekId: session.metadata?.weekId ?? intent?.weekId ?? "",
        status,
        createdAt: Timestamp.fromMillis(session.created * 1_000),
        updatedAt,
      } satisfies CheckoutSessionDocument,
      { merge: true },
    );
    transaction.set(intentRef, { status, updatedAt }, { merge: true });
    if (
      claimRef &&
      claimSnapshot?.get("intentId") === intentId
    ) {
      transaction.delete(claimRef);
    }
  });
}

function isCheckoutSessionId(value: string): boolean {
  return /^cs_(?:test_|live_)?[A-Za-z0-9]+$/.test(value);
}

async function fulfilledStatus(
  listingId: string,
  sessionId: string,
): Promise<BidStatusResponse> {
  const bidSnapshot = await getAdminDb().collection("bids").doc(sessionId).get();
  const appliedToActiveBoard = bidSnapshot.exists
    ? bidSnapshot.get("appliedToActiveBoard") !== false
    : true;

  if (!appliedToActiveBoard) {
    return {
      status: "fulfilled",
      rank: null,
      message:
        "Payment was confirmed after this board closed or the listing was removed. It was recorded but was not added to the active board.",
    };
  }

  const listing = await getPublicListingById(listingId);
  let rank: number | null = null;
  if (listing) {
    rank = await getListingRank(listingId).catch(() => null);
  }
  return {
    status: "fulfilled",
    ...(listing ? { listing } : {}),
    rank,
    message: rank
      ? `Payment confirmed. The listing is currently ranked #${rank}.`
      : "Payment confirmed. The listing is not currently visible on the board.",
  };
}

export async function getBidStatus(sessionId: string): Promise<BidStatusResponse> {
  requireFirebaseConfiguration();
  if (!isCheckoutSessionId(sessionId)) {
    throw new ApiError(400, "INVALID_SESSION_ID", "Enter a valid Checkout Session ID.");
  }

  const db = getAdminDb();
  const mapping = await db.collection("checkoutSessions").doc(sessionId).get();
  if (mapping.exists) {
    const status = mapping.get("status") as BidIntentStatus | undefined;
    const listingId = mapping.get("listingId");
    if (status === "fulfilled" && typeof listingId === "string") {
      return fulfilledStatus(listingId, sessionId);
    }
    if (status === "failed" || status === "expired") {
      return {
        status,
        message:
          status === "expired"
            ? "Checkout expired before payment completed. No ranking was granted."
            : "Payment did not complete. No ranking was granted.",
      };
    }
  }

  let stripeSession: Stripe.Checkout.Session;
  try {
    stripeSession = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch {
    throw new ApiError(404, "SESSION_NOT_FOUND", "Checkout Session not found.");
  }

  if (stripeSession.status === "expired") {
    return {
      status: "expired",
      message: "Checkout expired before payment completed. No ranking was granted.",
    };
  }
  if (stripeSession.payment_status === "paid") {
    return {
      status: "pending",
      message: "Payment is confirmed and the signed webhook is updating the board.",
    };
  }
  return {
    status: "pending",
    message: "Checkout has not completed yet.",
  };
}

export function toPublicListing(value: PublicListing): PublicListing {
  return value;
}
