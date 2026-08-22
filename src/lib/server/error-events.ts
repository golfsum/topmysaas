import "server-only";

import { createHash } from "node:crypto";

import {
  FieldValue,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";

import {
  sanitizeOperationalText,
  shouldRecordApiStatus,
} from "@/lib/domain/error-safety";
import type {
  PaymentConfiguration,
  SystemErrorActivity,
  SystemErrorCategory,
  SystemErrorFeed,
  SystemErrorSeverity,
} from "@/lib/domain/types";

import { ApiError } from "./api-error";
import { getAdminDb } from "./firebase-admin";
import { valueToIso } from "./firestore-mappers";

const ERROR_EVENTS_COLLECTION = "errorEvents";
const ERROR_RETENTION_DAYS = 90;
const ERROR_FEED_LIMIT = 100;
const reportedApiErrors = new WeakSet<object>();
const attemptedOneTimeEvents = new Set<string>();

const categories = new Set<SystemErrorCategory>([
  "payment",
  "checkout",
  "webhook",
  "firebase",
  "admin",
  "leaderboard",
  "system",
]);
const severities = new Set<SystemErrorSeverity>([
  "warning",
  "error",
  "critical",
]);

type StripeErrorProjection = {
  stripeRequestId?: string;
  stripeErrorType?: string;
  stripeErrorCode?: string;
  declineCode?: string;
};

export type RecordErrorEventInput = StripeErrorProjection & {
  category: SystemErrorCategory;
  severity: SystemErrorSeverity;
  code: string;
  operation: string;
  message: string;
  actionRequired?: boolean;
  retryable?: boolean;
  httpStatus?: number;
  requestId?: string;
  weekId?: string;
  listingId?: string;
  bidIntentId?: string;
  stripeLivemode?: boolean;
  stripeEventId?: string;
  stripeEventType?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  dedupeKey?: string;
  recordOnce?: boolean;
};

type ApiErrorEventContext = Omit<
  RecordErrorEventInput,
  "code" | "message" | "httpStatus"
> & {
  code?: string;
  message?: string;
  httpStatus?: number;
};

function optionalString(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function environmentName(): string {
  return sanitizeOperationalText(
    process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    "unknown",
    40,
  );
}

function environmentRef(db: Firestore) {
  return db.collection("systemEnvironments").doc(environmentName());
}

function errorEventCollection(db: Firestore) {
  return environmentRef(db).collection(ERROR_EVENTS_COLLECTION);
}

function strictIdentifier(
  value: unknown,
  pattern: RegExp,
  maxLength: number,
): string | undefined {
  const candidate = optionalString(value, maxLength);
  return candidate && pattern.test(candidate) ? candidate : undefined;
}

function errorEventDocumentId(dedupeKey: string): string {
  return `error-${createHash("sha256").update(dedupeKey).digest("hex").slice(0, 40)}`;
}

function stripeModeFromKey(secretKey = process.env.STRIPE_SECRET_KEY):
  PaymentConfiguration["stripeMode"] {
  const key = secretKey?.trim();
  if (!key) return "unconfigured";
  if (/^(?:sk|rk)_live_/.test(key)) return "live";
  if (/^(?:sk|rk)_test_/.test(key)) return "test";
  return "unknown";
}

export function getPaymentConfiguration(): PaymentConfiguration {
  return {
    stripeKeyConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    stripeMode: stripeModeFromKey(),
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
  };
}

export function requestIdFrom(request: Request): string | undefined {
  return strictIdentifier(
    request.headers.get("x-vercel-id"),
    /^[A-Za-z0-9:._-]+$/,
    160,
  );
}

export function projectStripeError(error: unknown): StripeErrorProjection {
  if (!error || typeof error !== "object") return {};

  const value = error as Record<string, unknown>;
  const stripeRequestId = strictIdentifier(
    value.requestId,
    /^req_[A-Za-z0-9_]+$/,
    120,
  );
  const stripeErrorType = strictIdentifier(
    value.type,
    /^[A-Za-z][A-Za-z0-9_]+$/,
    80,
  );
  const stripeErrorCode = strictIdentifier(
    value.code,
    /^[A-Za-z0-9_]+$/,
    100,
  );
  const declineCode = strictIdentifier(
    value.decline_code,
    /^[A-Za-z0-9_]+$/,
    100,
  );
  return {
    ...(stripeRequestId ? { stripeRequestId } : {}),
    ...(stripeErrorType ? { stripeErrorType } : {}),
    ...(stripeErrorCode ? { stripeErrorCode } : {}),
    ...(declineCode ? { declineCode } : {}),
  };
}

function buildSafeEvent(input: RecordErrorEventInput, now: Timestamp) {
  const requestId = strictIdentifier(
    input.requestId,
    /^[A-Za-z0-9:._-]+$/,
    160,
  );
  const weekId = strictIdentifier(
    input.weekId,
    /^\d{4}-\d{2}-\d{2}$/,
    10,
  );
  const listingId = strictIdentifier(
    input.listingId,
    /^[A-Za-z0-9_-]+$/,
    220,
  );
  const bidIntentId = strictIdentifier(
    input.bidIntentId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    36,
  );
  const stripeEventId = strictIdentifier(
    input.stripeEventId,
    /^evt_[A-Za-z0-9_]+$/,
    160,
  );
  const stripeEventType = strictIdentifier(
    input.stripeEventType,
    /^[a-z0-9._]+$/,
    160,
  );
  const stripeSessionId = strictIdentifier(
    input.stripeSessionId,
    /^cs_(?:test_|live_)?[A-Za-z0-9]+$/,
    160,
  );
  const stripePaymentIntentId = strictIdentifier(
    input.stripePaymentIntentId,
    /^pi_[A-Za-z0-9_]+$/,
    160,
  );
  const stripeRequestId = strictIdentifier(
    input.stripeRequestId,
    /^req_[A-Za-z0-9_]+$/,
    160,
  );
  const stripeErrorType = strictIdentifier(
    input.stripeErrorType,
    /^[A-Za-z][A-Za-z0-9_]+$/,
    100,
  );
  const stripeErrorCode = strictIdentifier(
    input.stripeErrorCode,
    /^[A-Za-z0-9_]+$/,
    100,
  );
  const declineCode = strictIdentifier(
    input.declineCode,
    /^[A-Za-z0-9_]+$/,
    100,
  );

  return {
    category: input.category,
    severity: input.severity,
    status: "open" as const,
    code: sanitizeOperationalText(input.code, "UNCLASSIFIED_ERROR", 120),
    operation: sanitizeOperationalText(input.operation, "unknown_operation", 160),
    message: sanitizeOperationalText(
      input.message,
      "An operational error occurred.",
      500,
    ),
    actionRequired: input.actionRequired === true,
    retryable: input.retryable === true,
    lastOccurredAt: now,
    expiresAt: Timestamp.fromMillis(
      now.toMillis() + ERROR_RETENTION_DAYS * 24 * 60 * 60_000,
    ),
    environment: environmentName(),
    ...(typeof input.httpStatus === "number" &&
    Number.isInteger(input.httpStatus) &&
    input.httpStatus >= 100 &&
    input.httpStatus <= 599
      ? { httpStatus: input.httpStatus }
      : {}),
    ...(requestId ? { requestId } : {}),
    ...(weekId ? { weekId } : {}),
    ...(listingId ? { listingId } : {}),
    ...(bidIntentId ? { bidIntentId } : {}),
    ...(typeof input.stripeLivemode === "boolean"
      ? { stripeLivemode: input.stripeLivemode }
      : {}),
    ...(stripeEventId ? { stripeEventId } : {}),
    ...(stripeEventType ? { stripeEventType } : {}),
    ...(stripeSessionId ? { stripeSessionId } : {}),
    ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    ...(stripeRequestId ? { stripeRequestId } : {}),
    ...(stripeErrorType ? { stripeErrorType } : {}),
    ...(stripeErrorCode ? { stripeErrorCode } : {}),
    ...(declineCode ? { declineCode } : {}),
  };
}

export async function recordErrorEvent(
  input: RecordErrorEventInput,
): Promise<void> {
  const oneTimeKey =
    input.recordOnce && input.dedupeKey
      ? `${environmentName()}:${input.dedupeKey}`
      : undefined;
  if (oneTimeKey && attemptedOneTimeEvents.has(oneTimeKey)) return;
  if (oneTimeKey) attemptedOneTimeEvents.add(oneTimeKey);

  const now = Timestamp.now();
  const event = buildSafeEvent(input, now);
  const structuredLog = JSON.stringify({
    level: input.severity,
    event: "system_error",
    ...event,
    lastOccurredAt: now.toDate().toISOString(),
    expiresAt: event.expiresAt.toDate().toISOString(),
  });

  if (input.severity === "warning") {
    console.warn(structuredLog);
  } else {
    console.error(structuredLog);
  }

  try {
    const db = getAdminDb();
    const collection = errorEventCollection(db);
    if (input.dedupeKey) {
      const ref = collection.doc(errorEventDocumentId(input.dedupeKey));
      if (input.recordOnce) {
        await ref.create({
          ...event,
          firstOccurredAt: now,
          occurrenceCount: 1,
        });
        return;
      }
      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        transaction.set(
          ref,
          {
            ...event,
            firstOccurredAt: existing.exists
              ? existing.get("firstOccurredAt") || now
              : now,
            occurrenceCount: existing.exists ? FieldValue.increment(1) : 1,
            ...(existing.exists
              ? { resolvedAt: FieldValue.delete() }
              : {}),
          },
          { merge: true },
        );
      });
      return;
    }

    await collection.add({
      ...event,
      firstOccurredAt: now,
      occurrenceCount: 1,
    });
  } catch (writeError) {
    if (
      input.recordOnce &&
      writeError &&
      typeof writeError === "object" &&
      "code" in writeError &&
      (writeError.code === 6 || writeError.code === "already-exists")
    ) {
      return;
    }
    console.error(
      JSON.stringify({
        level: "error",
        event: "error_event_write_failed",
        code: event.code,
        operation: event.operation,
        loggerErrorType:
          writeError instanceof Error ? writeError.name : "UnknownError",
      }),
    );
  }
}

export async function recordApiErrorEvent(
  error: unknown,
  context: ApiErrorEventContext,
): Promise<void> {
  const status =
    context.httpStatus ?? (error instanceof ApiError ? error.status : 500);
  if (!shouldRecordApiStatus(status)) return;
  if (
    error &&
    typeof error === "object" &&
    reportedApiErrors.has(error)
  ) {
    return;
  }

  await recordErrorEvent({
    ...context,
    ...projectStripeError(error),
    code:
      context.code ??
      (error instanceof ApiError ? error.code : "INTERNAL_SERVER_ERROR"),
    message:
      context.message ??
      (error instanceof ApiError
        ? error.message
        : "An unexpected server error interrupted this operation."),
    httpStatus: status,
  });
  if (error && typeof error === "object") {
    reportedApiErrors.add(error);
  }
}

export async function resolveErrorEventByDedupeKey(
  dedupeKey: string,
): Promise<void> {
  try {
    const db = getAdminDb();
    const ref = errorEventCollection(db).doc(errorEventDocumentId(dedupeKey));
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.get("status") === "resolved") return;
    await ref.update({
      status: "resolved",
      resolvedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "error_event_auto_resolution_failed",
        loggerErrorType: error instanceof Error ? error.name : "UnknownError",
      }),
    );
  }
}

export async function recordVerifiedStripeWebhook(input: {
  eventId: string;
  eventType: string;
  livemode: boolean;
}): Promise<void> {
  const eventId = strictIdentifier(
    input.eventId,
    /^evt_[A-Za-z0-9_]+$/,
    160,
  );
  const eventType = strictIdentifier(
    input.eventType,
    /^[a-z0-9._]+$/,
    160,
  );
  if (!eventId || !eventType) return;

  try {
    const db = getAdminDb();
    await environmentRef(db).collection("health").doc("stripe").set(
      {
        lastVerifiedWebhookAt: FieldValue.serverTimestamp(),
        lastVerifiedWebhookEventId: eventId,
        lastVerifiedWebhookEventType: eventType,
        lastVerifiedWebhookLivemode: input.livemode,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "stripe_webhook_health_write_failed",
        stripeEventId: eventId,
        loggerErrorType: error instanceof Error ? error.name : "UnknownError",
      }),
    );
  }
}

function mapErrorActivity(
  snapshot: FirebaseFirestore.QueryDocumentSnapshot,
): SystemErrorActivity {
  const data = snapshot.data();
  const category = categories.has(data.category)
    ? (data.category as SystemErrorCategory)
    : "system";
  const severity = severities.has(data.severity)
    ? (data.severity as SystemErrorSeverity)
    : "error";

  const activity: SystemErrorActivity = {
    id: snapshot.id,
    category,
    severity,
    status: data.status === "resolved" ? "resolved" : "open",
    code: optionalString(data.code, 120) ?? "UNCLASSIFIED_ERROR",
    operation: optionalString(data.operation, 160) ?? "unknown_operation",
    message:
      optionalString(data.message, 500) ?? "An operational error occurred.",
    actionRequired: data.actionRequired === true,
    retryable: data.retryable === true,
    occurrenceCount:
      typeof data.occurrenceCount === "number" &&
      Number.isSafeInteger(data.occurrenceCount) &&
      data.occurrenceCount > 0
        ? data.occurrenceCount
        : 1,
    firstOccurredAt: valueToIso(data.firstOccurredAt),
    lastOccurredAt: valueToIso(data.lastOccurredAt),
    environment: optionalString(data.environment, 40) ?? "unknown",
  };

  const optionalFields = [
    "requestId",
    "weekId",
    "listingId",
    "bidIntentId",
    "stripeEventId",
    "stripeEventType",
    "stripeSessionId",
    "stripePaymentIntentId",
    "stripeRequestId",
    "stripeErrorType",
    "stripeErrorCode",
    "declineCode",
  ] as const;
  for (const field of optionalFields) {
    const value = optionalString(data[field], 220);
    if (value) activity[field] = value;
  }
  if (
    typeof data.httpStatus === "number" &&
    Number.isInteger(data.httpStatus)
  ) {
    activity.httpStatus = data.httpStatus;
  }
  if (typeof data.stripeLivemode === "boolean") {
    activity.stripeLivemode = data.stripeLivemode;
  }
  if (data.resolvedAt) {
    activity.resolvedAt = valueToIso(data.resolvedAt);
  }

  return activity;
}

export async function getSystemErrorFeed(
  now = new Date(),
): Promise<SystemErrorFeed> {
  const db = getAdminDb();
  const [errorsSnapshot, latestBidSnapshot, stripeHealthSnapshot] =
    await Promise.all([
    errorEventCollection(db)
      .orderBy("lastOccurredAt", "desc")
      .limit(ERROR_FEED_LIMIT)
      .get(),
    db.collection("bids").orderBy("createdAt", "desc").limit(1).get(),
    environmentRef(db).collection("health").doc("stripe").get(),
  ]);

  const latestBid = latestBidSnapshot.docs[0];
  return {
    errors: errorsSnapshot.docs.map(mapErrorActivity),
    paymentConfiguration: getPaymentConfiguration(),
    ...(latestBid
      ? { lastSuccessfulPaymentAt: valueToIso(latestBid.get("createdAt")) }
      : {}),
    ...(stripeHealthSnapshot.exists
      ? {
          lastVerifiedWebhookAt: valueToIso(
            stripeHealthSnapshot.get("lastVerifiedWebhookAt"),
          ),
          ...(typeof stripeHealthSnapshot.get(
            "lastVerifiedWebhookLivemode",
          ) === "boolean"
            ? {
                lastVerifiedWebhookLivemode: stripeHealthSnapshot.get(
                  "lastVerifiedWebhookLivemode",
                ) as boolean,
              }
            : {}),
          ...(optionalString(
            stripeHealthSnapshot.get("lastVerifiedWebhookEventType"),
            160,
          )
            ? {
                lastVerifiedWebhookEventType: optionalString(
                  stripeHealthSnapshot.get("lastVerifiedWebhookEventType"),
                  160,
                ),
              }
            : {}),
        }
      : {}),
    generatedAt: now.toISOString(),
  };
}

export async function setSystemErrorResolution(
  errorId: string,
  resolved: boolean,
): Promise<void> {
  const db = getAdminDb();
  const ref = errorEventCollection(db).doc(errorId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new ApiError(404, "ERROR_EVENT_NOT_FOUND", "Error event not found.");
  }

  await ref.update({
    status: resolved ? "resolved" : "open",
    resolvedAt: resolved ? Timestamp.now() : FieldValue.delete(),
  });
}
