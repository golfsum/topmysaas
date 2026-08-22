import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const boardDataSource = readFileSync(
  join(process.cwd(), "src/lib/server/board-data.ts"),
  "utf8",
);

describe("public ranking visibility", () => {
  it("does not truncate the Firestore leaderboard query to five listings", () => {
    expect(boardDataSource).not.toMatch(/\.limit\(5\)/);
  });
});
