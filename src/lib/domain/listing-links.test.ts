import { describe, expect, it } from "vitest";

import { isListingDocumentId, listingVisitPath } from "./listing-links";

describe("tracked listing links", () => {
  it("builds a same-origin visit path for a Firestore listing ID", () => {
    expect(listingVisitPath("admin-clientplot_1")).toBe(
      "/go/admin-clientplot_1",
    );
  });

  it("accepts bounded Firestore IDs and rejects path-like input", () => {
    expect(isListingDocumentId("a3f5_admin-listing")).toBe(true);
    expect(isListingDocumentId("../clientplot")).toBe(false);
    expect(isListingDocumentId("client/plot")).toBe(false);
    expect(isListingDocumentId("x".repeat(129))).toBe(false);
  });
});
