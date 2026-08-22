import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/server/api-error";
import { getBidStatus } from "@/lib/server/checkout-service";
import {
  recordApiErrorEvent,
  requestIdFrom,
} from "@/lib/server/error-events";

export async function GET(request: NextRequest) {
  let sessionId: string | undefined;

  try {
    sessionId = request.nextUrl.searchParams.get("session_id")?.trim();
    if (!sessionId) {
      throw new ApiError(
        400,
        "SESSION_ID_REQUIRED",
        "The session_id query parameter is required.",
      );
    }
    const status = await getBidStatus(sessionId);
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code =
      error instanceof ApiError ? error.code : "BID_STATUS_INTERNAL_ERROR";
    await recordApiErrorEvent(error, {
      category: "payment",
      severity: "error",
      operation: "get_bid_status",
      requestId: requestIdFrom(request),
      stripeSessionId: sessionId,
      actionRequired: true,
      retryable: true,
      dedupeKey: `bid-status:${code}`,
    });
    return apiErrorResponse(error);
  }
}
