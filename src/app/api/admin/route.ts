import { NextResponse } from "next/server";

import { performAdminAction } from "@/lib/server/admin-actions";
import { requireAdminSession } from "@/lib/server/admin-auth";
import { getAdminDashboard } from "@/lib/server/admin-data";
import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/server/api-error";

export async function GET() {
  try {
    const dashboard = await getAdminDashboard();
    return NextResponse.json(
      { dashboard },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdminSession();
    const result = await performAdminAction(await readJson(request));
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
