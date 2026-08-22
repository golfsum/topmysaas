import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const checkoutSource = readFileSync(
  join(process.cwd(), "src/lib/server/checkout-service.ts"),
  "utf8",
);
const webhookSource = readFileSync(
  join(process.cwd(), "src/app/api/stripe/webhook/route.ts"),
  "utf8",
);

describe("payment observability coverage", () => {
  it("propagates safe bid metadata to PaymentIntent failure events", () => {
    expect(checkoutSource).toMatch(
      /payment_intent_data:\s*{\s*metadata:\s*{[\s\S]*?topmysaasApp:\s*TOPMYSAAS_STRIPE_APP,[\s\S]*?bidIntentId:\s*intentId,[\s\S]*?listingId:\s*prepared\.listingId,[\s\S]*?weekId,/,
    );
    expect(webhookSource).toContain('case "payment_intent.payment_failed"');
    expect(webhookSource).toContain('code: "STRIPE_PAYMENT_INTENT_FAILED"');
    expect(webhookSource).toContain("isTopMySaasStripeMetadata");
  });

  it("distinguishes a missing Session from a Stripe status outage", () => {
    expect(checkoutSource).toContain('"SESSION_NOT_FOUND"');
    expect(checkoutSource).toContain('"STRIPE_STATUS_UNAVAILABLE"');
    expect(checkoutSource).toContain('error.code === "resource_missing"');
  });

  it("loads Stripe configuration before the invalid-signature catch", () => {
    const secretPosition = webhookSource.indexOf(
      "const webhookSecret = getStripeWebhookSecret();",
    );
    const signatureTryPosition = webhookSource.indexOf(
      "try {\n      event = stripe.webhooks.constructEvent",
    );

    expect(secretPosition).toBeGreaterThan(-1);
    expect(signatureTryPosition).toBeGreaterThan(secretPosition);
  });
});
