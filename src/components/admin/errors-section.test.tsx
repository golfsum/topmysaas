import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SystemErrorFeed } from "@/lib/domain/types";

import { ErrorsSection } from "./errors-section";

const baseFeed: SystemErrorFeed = {
  paymentConfiguration: {
    stripeKeyConfigured: true,
    stripeMode: "live",
    webhookConfigured: true,
  },
  lastSuccessfulPaymentAt: "2026-08-22T08:00:00.000Z",
  generatedAt: "2026-08-22T08:10:00.000Z",
  errors: [],
};

describe("admin system errors section", () => {
  it("prioritizes live Stripe payment diagnostics and safe references", () => {
    const html = renderToStaticMarkup(
      <ErrorsSection
        refreshKey={0}
        onUnauthorized={() => {}}
        initialFeed={{
          ...baseFeed,
          errors: [
            {
              id: "error-1",
              category: "webhook",
              severity: "critical",
              status: "open",
              code: "WEBHOOK_PROCESSING_FAILED",
              operation: "process_stripe_event:checkout.session.completed",
              message: "A paid webhook could not update the board.",
              actionRequired: true,
              retryable: true,
              occurrenceCount: 2,
              firstOccurredAt: "2026-08-22T08:05:00.000Z",
              lastOccurredAt: "2026-08-22T08:06:00.000Z",
              environment: "production",
              stripeLivemode: true,
              stripeEventId: "evt_live_123",
              stripeSessionId: "cs_live_123",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("Live key configured");
    expect(html).toContain("Secret configured");
    expect(html).toContain("1 payment-related");
    expect(html).toContain("WEBHOOK_PROCESSING_FAILED");
    expect(html).toContain("2 occurrences");
    expect(html).toContain("cs_live_123");
  });

  it("shows a clear empty state when no failures have been recorded", () => {
    const html = renderToStaticMarkup(
      <ErrorsSection
        refreshKey={0}
        onUnauthorized={() => {}}
        initialFeed={baseFeed}
      />,
    );

    expect(html).toContain("No recorded system errors");
    expect(html).toContain("Last successful payment");
  });
});
