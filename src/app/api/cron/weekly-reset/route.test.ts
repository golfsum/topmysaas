import { afterEach, describe, expect, it, vi } from "vitest";

const {
  recordErrorEvent,
  resetPreviousBoardOnSchedule,
  resolveErrorEventByDedupeKey,
} = vi.hoisted(() => ({
  recordErrorEvent: vi.fn(),
  resetPreviousBoardOnSchedule: vi.fn(),
  resolveErrorEventByDedupeKey: vi.fn(),
}));

vi.mock("@/lib/server/board-data", () => ({
  resetPreviousBoardOnSchedule,
}));
vi.mock("@/lib/server/error-events", () => ({
  recordErrorEvent,
  requestIdFrom: () => "cron-request-id",
  resolveErrorEventByDedupeKey,
}));

import { GET } from "./route";

function cronRequest(authorization = "Bearer cron-test-secret") {
  return new Request("https://topmysaas.com/api/cron/weekly-reset", {
    headers: { authorization },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("weekly reset cron route", () => {
  it("fails closed when cron authentication is missing or invalid", async () => {
    expect((await GET(cronRequest())).status).toBe(503);

    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    expect((await GET(cronRequest("Bearer wrong-secret"))).status).toBe(401);
    expect((await GET(cronRequest("Bearer undefined"))).status).toBe(401);
    expect(resetPreviousBoardOnSchedule).not.toHaveBeenCalled();
  });

  it("preserves the opening board when the launch-day cron fires", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:07:00.000Z"));

    const response = await GET(cronRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      action: "preserved-opening-board",
      firstResetAt: "2026-08-31T00:00:00.000Z",
    });
    expect(resetPreviousBoardOnSchedule).not.toHaveBeenCalled();
  });

  it("resets the previous board even when the Monday cron is delayed", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:12:00.000Z"));
    resetPreviousBoardOnSchedule.mockResolvedValue({
      resetId: "weekly-2026-08-17",
      weekId: "2026-08-17",
      status: "completed",
      deactivatedCount: 2,
    });

    const response = await GET(cronRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      weekId: "2026-08-17",
      deactivatedCount: 2,
    });
    expect(resetPreviousBoardOnSchedule).toHaveBeenCalledWith(
      new Date("2026-08-31T00:12:00.000Z"),
    );
    expect(resolveErrorEventByDedupeKey).toHaveBeenCalledWith(
      "vercel-cron:weekly-reset:2026-08-17",
    );
  });

  it("records reset failures for the admin error feed", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T00:03:00.000Z"));
    resetPreviousBoardOnSchedule.mockRejectedValue(new Error("Firestore down"));

    const response = await GET(cronRequest());
    expect(response.status).toBe(500);
    expect(recordErrorEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "WEEKLY_BOARD_RESET_FAILED",
        weekId: "2026-08-31",
        actionRequired: true,
      }),
    );
  });
});
