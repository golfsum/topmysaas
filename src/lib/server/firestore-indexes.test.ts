import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type IndexField = {
  fieldPath: string;
  order: "ASCENDING" | "DESCENDING";
};

type FirestoreIndex = {
  collectionGroup: string;
  queryScope: "COLLECTION" | "COLLECTION_GROUP";
  fields: IndexField[];
};

type FieldOverride = {
  collectionGroup: string;
  fieldPath: string;
  ttl?: boolean;
};

const indexConfig = JSON.parse(
  readFileSync(join(process.cwd(), "firestore.indexes.json"), "utf8"),
) as { indexes: FirestoreIndex[]; fieldOverrides: FieldOverride[] };

function includesIndex(collectionGroup: string, fields: IndexField[]): boolean {
  return indexConfig.indexes.some(
    (index) =>
      index.collectionGroup === collectionGroup &&
      index.queryScope === "COLLECTION" &&
      JSON.stringify(index.fields) === JSON.stringify(fields),
  );
}

describe("Firestore composite indexes", () => {
  it("covers the public leaderboard query", () => {
    expect(
      includesIndex("listings", [
        { fieldPath: "weekId", order: "ASCENDING" },
        { fieldPath: "boardGeneration", order: "ASCENDING" },
        { fieldPath: "isActive", order: "ASCENDING" },
        { fieldPath: "bidAmountCents", order: "DESCENDING" },
        { fieldPath: "createdAt", order: "ASCENDING" },
      ]),
    ).toBe(true);
  });

  it("covers the ordered admin listings query", () => {
    expect(
      includesIndex("listings", [
        { fieldPath: "weekId", order: "ASCENDING" },
        { fieldPath: "boardGeneration", order: "ASCENDING" },
        { fieldPath: "bidAmountCents", order: "DESCENDING" },
        { fieldPath: "createdAt", order: "ASCENDING" },
      ]),
    ).toBe(true);
  });

  it("covers the weekly bid revenue aggregation", () => {
    expect(
      includesIndex("bids", [
        { fieldPath: "weekId", order: "ASCENDING" },
        { fieldPath: "amountCents", order: "ASCENDING" },
      ]),
    ).toBe(true);
  });

  it("expires sanitized operational errors after their retention window", () => {
    expect(indexConfig.fieldOverrides).toContainEqual(
      expect.objectContaining({
        collectionGroup: "errorEvents",
        fieldPath: "expiresAt",
        ttl: true,
      }),
    );
  });
});
