import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const serverMocks = vi.hoisted(() => ({
  getAdminDb: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./firebase-admin", () => ({ getAdminDb: serverMocks.getAdminDb }));

import { ApiError } from "./api-error";
import { recordApiErrorEvent, recordErrorEvent } from "./error-events";

function createDb() {
  const add = vi.fn().mockResolvedValue({ id: "new-error" });
  const transactionSet = vi.fn();
  let transactionReads = 0;
  const runTransaction = vi.fn(async (callback) =>
    callback({
      get: vi.fn().mockImplementation(async () => ({
        exists: transactionReads++ > 0,
        get: vi.fn().mockReturnValue(undefined),
      })),
      set: transactionSet,
    }),
  );
  const doc = vi.fn((id: string) => ({
    id,
    path: `documents/${id}`,
    collection: vi.fn(() => ({ add, doc })),
  }));
  const collection = vi.fn(() => ({ add, doc }));
  return { db: { collection, runTransaction }, add, doc, transactionSet };
}

describe("system error recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores only the sanitized operator message", async () => {
    const { db, add } = createDb();
    serverMocks.getAdminDb.mockReturnValue(db);

    await recordErrorEvent({
      category: "payment",
      severity: "error",
      code: "CHECKOUT_FAILED",
      operation: "create_checkout",
      message:
        "Failed for buyer@example.com with sk_live_supersecret and whsec_secret",
    });

    const stored = add.mock.calls[0][0] as Record<string, unknown>;
    expect(stored.message).toContain("[redacted email]");
    expect(stored.message).not.toContain("buyer@example.com");
    expect(stored.message).not.toContain("sk_live_supersecret");
    expect(stored.message).not.toContain("whsec_secret");
    expect(stored).not.toHaveProperty("stack");
    expect(db.collection).toHaveBeenCalledWith("systemEnvironments");
  });

  it("uses one deterministic document for repeated Stripe event delivery", async () => {
    const { db, doc, transactionSet } = createDb();
    serverMocks.getAdminDb.mockReturnValue(db);
    const event = {
      category: "webhook" as const,
      severity: "critical" as const,
      code: "WEBHOOK_PROCESSING_FAILED",
      operation: "process_stripe_event",
      message: "A paid webhook could not update the board.",
      stripeEventId: "evt_live_123",
      dedupeKey: "stripe:evt_live_123:processing-failed",
    };

    await recordErrorEvent(event);
    await recordErrorEvent(event);

    const errorDocumentIds = doc.mock.calls
      .map(([id]) => String(id))
      .filter((id) => id.startsWith("error-"));
    expect(errorDocumentIds).toHaveLength(2);
    expect(errorDocumentIds[0]).toBe(errorDocumentIds[1]);
    expect(transactionSet).toHaveBeenCalledTimes(2);
    expect(transactionSet.mock.calls[0][1]).toMatchObject({
      occurrenceCount: 1,
      status: "open",
    });
  });

  it("never replaces the original failure when Firestore logging is unavailable", async () => {
    serverMocks.getAdminDb.mockImplementation(() => {
      throw new Error("Firestore unavailable");
    });

    await expect(
      recordErrorEvent({
        category: "firebase",
        severity: "critical",
        code: "FIRESTORE_UNAVAILABLE",
        operation: "write_payment_result",
        message: "The payment result could not be persisted.",
      }),
    ).resolves.toBeUndefined();
  });

  it("skips expected client and bidding-flow errors", async () => {
    const { db } = createDb();
    serverMocks.getAdminDb.mockReturnValue(db);

    await recordApiErrorEvent(
      new ApiError(409, "TARGET_MOVED", "The target rank moved."),
      {
        category: "checkout",
        severity: "warning",
        operation: "create_checkout",
      },
    );

    expect(serverMocks.getAdminDb).not.toHaveBeenCalled();
  });
});
