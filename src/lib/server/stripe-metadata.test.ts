import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isTopMySaasStripeMetadata,
  TOPMYSAAS_STRIPE_APP,
} from "./stripe-metadata";

describe("Stripe event ownership metadata", () => {
  it("accepts the explicit TopMySaaS application marker", () => {
    expect(
      isTopMySaasStripeMetadata({
        topmysaasApp: TOPMYSAAS_STRIPE_APP,
      }),
    ).toBe(true);
  });

  it("accepts in-flight legacy Checkout Sessions with the original bid fields", () => {
    expect(
      isTopMySaasStripeMetadata({
        bidIntentId: "550e8400-e29b-41d4-a716-446655440000",
        listingId: "listing-123",
        weekId: "2026-08-17",
      }),
    ).toBe(true);
  });

  it("ignores unrelated account-wide Stripe events", () => {
    expect(
      isTopMySaasStripeMetadata({
        orderId: "another-product-order",
      }),
    ).toBe(false);
  });
});
