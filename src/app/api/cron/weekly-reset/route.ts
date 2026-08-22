import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  INITIAL_LIVE_WEEK_END_AT,
  isInitialExtendedBoardPeriod,
} from "@/lib/domain/launch";
import { getPreviousWeekId } from "@/lib/domain/week";
import { resetPreviousBoardOnSchedule } from "@/lib/server/board-data";
import {
  recordErrorEvent,
  requestIdFrom,
  resolveErrorEventByDedupeKey,
} from "@/lib/server/error-events";

export const runtime = "nodejs";
export const maxDuration = 300;

function hasValidCronAuthorization(request: Request, secret: string): boolean {
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return json(
      { ok: false, error: "Scheduled reset authentication is not configured." },
      503,
    );
  }
  if (!hasValidCronAuthorization(request, cronSecret)) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  const scheduledAt = new Date();
  if (isInitialExtendedBoardPeriod(scheduledAt)) {
    return json({
      ok: true,
      action: "preserved-opening-board",
      firstResetAt: INITIAL_LIVE_WEEK_END_AT,
    });
  }

  const weekId = getPreviousWeekId(scheduledAt);
  try {
    const result = await resetPreviousBoardOnSchedule(scheduledAt);
    await resolveErrorEventByDedupeKey(
      `vercel-cron:weekly-reset:${result.weekId}`,
    );
    return json({ ok: true, ...result });
  } catch {
    await recordErrorEvent({
      category: "system",
      severity: "critical",
      code: "WEEKLY_BOARD_RESET_FAILED",
      operation: "vercel_cron_weekly_board_reset",
      message: "The scheduled weekly board reset failed before completion.",
      actionRequired: true,
      retryable: true,
      requestId: requestIdFrom(request),
      weekId,
      dedupeKey: `vercel-cron:weekly-reset:${weekId}`,
    });
    return json(
      {
        ok: false,
        error: "The scheduled board reset failed and was recorded for review.",
      },
      500,
    );
  }
}
