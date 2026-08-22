import { describe, expect, it } from "vitest";

import { listingOwnershipMatches } from "./listing-ownership";

describe("listing ownership", () => {
  it("lets the first successful bidder claim an unowned pre-launch listing", () => {
    expect(listingOwnershipMatches(undefined, "first-device")).toBe(true);
  });

  it("allows later increases only from the claiming device", () => {
    expect(listingOwnershipMatches("first-device", "first-device")).toBe(true);
    expect(listingOwnershipMatches("first-device", "other-device")).toBe(false);
  });
});
