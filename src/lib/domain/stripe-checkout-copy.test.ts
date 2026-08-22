import { describe, expect, it } from "vitest";

import { createStripeCheckoutCopy } from "./stripe-checkout-copy";

describe("Stripe Checkout bid copy", () => {
  it("shows the entered total when a new listing pays that full price", () => {
    expect(createStripeCheckoutCopy("ClientPlot.com", 500, 500)).toEqual({
      productName: "TopMySaaS bid to $5.00 total for ClientPlot.com",
      description: "Weekly leaderboard total after payment: $5.00.",
      submitMessage:
        "This payment sets the weekly bid total to $5.00. Final rank is recalculated after payment.",
    });
  });

  it("distinguishes an owned listing's target total from today's increase", () => {
    const copy = createStripeCheckoutCopy("ClientPlot.com", 1_100, 500);

    expect(copy.productName).toContain("$11.00 total");
    expect(copy.description).toContain("Amount due today is the $5.00 increase");
    expect(copy.submitMessage).toContain("charged $5.00 today");
  });
});
