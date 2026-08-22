import { NextResponse } from "next/server";

import { performAdminAction } from "@/lib/server/admin-actions";
import { requireAdminSession } from "@/lib/server/admin-auth";
import { getAdminDashboard } from "@/lib/server/admin-data";
import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/server/api-error";
import {
  recordApiErrorEvent,
  requestIdFrom,
} from "@/lib/server/error-events";

export async function GET(request: Request) {
  try {
    const dashboard = await getAdminDashboard();
    return NextResponse.json(
      { dashboard },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await recordApiErrorEvent(error, {
      category: "admin",
      severity: "error",
      operation: "load_admin_dashboard",
      requestId: requestIdFrom(request),
      actionRequired: true,
      retryable: true,
      dedupeKey: "admin:dashboard-load",
    });
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
    await recordApiErrorEvent(error, {
      category: "admin",
      severity: "error",
      operation: "perform_admin_action",
      requestId: requestIdFrom(request),
      actionRequired: true,
      retryable: true,
      dedupeKey: "admin:action-failed",
    });
    return apiErrorResponse(error);
  }
}
