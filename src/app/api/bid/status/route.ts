import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/server/api-error";
import { getBidStatus } from "@/lib/server/checkout-service";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id")?.trim();
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
    return apiErrorResponse(error);
  }
}
