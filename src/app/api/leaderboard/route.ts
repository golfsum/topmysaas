import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/server/api-error";
import { getLeaderboardSnapshot } from "@/lib/server/board-data";

export async function GET() {
  try {
    const snapshot = await getLeaderboardSnapshot();
    return NextResponse.json(snapshot, {
      status: snapshot.source === "unavailable" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
