import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const checkoutServiceSource = readFileSync(
  join(process.cwd(), "src/lib/server/checkout-service.ts"),
  "utf8",
);

describe("Stripe Checkout compatibility", () => {
  it("lets Managed Payments select the available payment methods", () => {
    expect(checkoutServiceSource).not.toMatch(/\bpayment_method_types\s*:/);
  });
});
