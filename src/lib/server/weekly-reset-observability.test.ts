import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  INITIAL_BOARD_START_AT,
  INITIAL_LAUNCH_AT,
  INITIAL_LIVE_WEEK_END_AT,
} from "@/lib/domain/launch";

const functionSource = readFileSync(
  join(process.cwd(), "functions/src/index.ts"),
  "utf8",
);
const seedSource = readFileSync(
  join(process.cwd(), "scripts/seed-prelaunch.mjs"),
  "utf8",
);
const boardDataSource = readFileSync(
  join(process.cwd(), "src/lib/server/board-data.ts"),
  "utf8",
);
const checkoutSource = readFileSync(
  join(process.cwd(), "src/lib/server/checkout-service.ts"),
  "utf8",
);
const cronRouteSource = readFileSync(
  join(process.cwd(), "src/app/api/cron/weekly-reset/route.ts"),
  "utf8",
);
const vercelConfig = readFileSync(
  join(process.cwd(), "vercel.json"),
  "utf8",
);

describe("weekly reset observability", () => {
  it("retains the opening board at launch and clears it on August 31", () => {
    for (const timestamp of [
      INITIAL_BOARD_START_AT,
      INITIAL_LAUNCH_AT,
      INITIAL_LIVE_WEEK_END_AT,
    ]) {
      expect(functionSource).toContain(timestamp);
    }
    expect(functionSource).toContain(
      "if (isInitialLaunchTransition(scheduledAt))",
    );
    expect(functionSource).toContain(
      'retainedWeekId: INITIAL_BOARD_WEEK_ID',
    );
    expect(functionSource).toContain(
      "Initial public launch retained the pre-launch board",
    );
  });

  it("keeps the pre-launch seed on the same extended board schedule", () => {
    expect(seedSource).toContain(INITIAL_BOARD_START_AT);
    expect(seedSource).toContain(INITIAL_LIVE_WEEK_END_AT);
    expect(seedSource).toContain('return "2026-08-17"');
  });

  it("does not deactivate a listing that moved to a new board during reset", () => {
    for (const source of [functionSource, boardDataSource]) {
      expect(source).toContain("deactivateListingsStillOnBoard");
      expect(source).toContain("transaction.get(listing.ref)");
      expect(source).toContain('current.get("weekId") !== weekId');
      expect(source).toContain('current.get("boardGeneration")');
    }
  });

  it("does not apply a delayed paid intent after its board period ends", () => {
    expect(checkoutSource).toContain(
      "const activeWeekId = getUtcWeekBounds(fulfilledAt.toDate()).weekId",
    );
    expect(checkoutSource).toContain(
      "const intentTargetsActiveBoard = intent.weekId === activeWeekId",
    );
    expect(checkoutSource).toMatch(
      /const boardAcceptsPayment =\s*intentTargetsActiveBoard &&/,
    );
  });

  it("records a failed reset and rethrows so the scheduler can retry", () => {
    expect(functionSource).toContain('code: "WEEKLY_BOARD_RESET_FAILED"');
    expect(functionSource).toContain('status: "failed"');
    expect(functionSource).toMatch(/logger\.error\("Weekly board reset failed"/);
    expect(functionSource).toContain("throw error;");
  });

  it("uses an authenticated Vercel cron as the production reset scheduler", () => {
    expect(vercelConfig).toContain('"path": "/api/cron/weekly-reset"');
    expect(vercelConfig).toContain('"schedule": "0 0 * * *"');
    expect(cronRouteSource).toContain("process.env.CRON_SECRET");
    expect(cronRouteSource).toContain("timingSafeEqual");
    expect(cronRouteSource).toContain(
      "if (isInitialExtendedBoardPeriod(scheduledAt))",
    );
    expect(boardDataSource).toContain("resetPreviousBoardOnSchedule");
    expect(boardDataSource).toContain('status: "already-complete"');
    expect(boardDataSource).toContain("leaseExpiresAt");
  });

  it("retries the same board generation after a recorded failure", () => {
    expect(functionSource).toMatch(
      /existingReset\.get\("status"\) === "running" \|\|\s*existingReset\.get\("status"\) === "failed"/,
    );
  });
});
