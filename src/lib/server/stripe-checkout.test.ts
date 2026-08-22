import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const checkoutServiceSource = readFileSync(
  join(process.cwd(), "src/lib/server/checkout-service.ts"),
  "utf8",
);

describe("Stripe Checkout compatibility", () => {
  it("uses standard Stripe Payments for leaderboard placement", () => {
    expect(checkoutServiceSource).not.toMatch(/\bpayment_method_types\s*:/);
    expect(checkoutServiceSource).toMatch(
      /managed_payments:\s*{\s*enabled:\s*false\s*}/,
    );
  });
});
