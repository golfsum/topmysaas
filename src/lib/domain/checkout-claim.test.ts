import { describe, expect, it } from "vitest";

import { checkoutClaimAction } from "./checkout-claim";

describe("checkout claim replacement", () => {
  it("expires an abandoned open session owned by the requester", () => {
    expect(checkoutClaimAction("open", true)).toBe("expire");
  });

  it("does not expire another device's open session", () => {
    expect(checkoutClaimAction("open", false)).toBe("block");
  });

  it("waits for completed sessions to finish fulfillment", () => {
    expect(checkoutClaimAction("complete", true)).toBe("block");
    expect(checkoutClaimAction(null, true)).toBe("block");
  });

  it("releases an already expired session", () => {
    expect(checkoutClaimAction("expired", false)).toBe("release");
  });
});
