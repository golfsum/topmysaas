import { NextResponse } from "next/server";
import { z } from "zod";

import type { StripeConnectionCheck } from "@/lib/domain/types";
import { requireAdminSession } from "@/lib/server/admin-auth";
import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/server/api-error";
import {
  getPaymentConfiguration,
  getSystemErrorFeed,
  recordApiErrorEvent,
  requestIdFrom,
  resolveErrorEventByDedupeKey,
  setSystemErrorResolution,
} from "@/lib/server/error-events";
import { getStripe } from "@/lib/server/stripe";

const errorIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^/]+$/, "Error event ID is invalid.");

const errorActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setResolution"),
    id: errorIdSchema,
    resolved: z.boolean(),
  }),
  z.object({ action: z.literal("checkStripe") }),
]);

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    return NextResponse.json(
      { feed: await getSystemErrorFeed() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await recordApiErrorEvent(error, {
      category: "admin",
      severity: "error",
      operation: "load_admin_error_feed",
      requestId: requestIdFrom(request),
      retryable: true,
      actionRequired: true,
      dedupeKey: "admin:error-feed-load",
    });
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let operation = "update_admin_error_feed";

  try {
    assertSameOrigin(request);
    await requireAdminSession();
    const input = errorActionSchema.parse(await readJson(request));

    if (input.action === "setResolution") {
      operation = "set_error_resolution";
      await setSystemErrorResolution(input.id, input.resolved);
      return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    operation = "check_stripe_connection";
    const startedAt = Date.now();
    await getStripe().checkout.sessions.list({ limit: 1 });
    await resolveErrorEventByDedupeKey("payment:stripe-connection-check");
    const result: StripeConnectionCheck = {
      reachable: true,
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      stripeMode: getPaymentConfiguration().stripeMode,
    };
    return NextResponse.json(
      { ok: true, stripeCheck: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const isStripeCheck = operation === "check_stripe_connection";
    await recordApiErrorEvent(error, {
      category: isStripeCheck ? "payment" : "admin",
      severity: isStripeCheck ? "critical" : "error",
      operation,
      requestId: requestIdFrom(request),
      retryable: true,
      actionRequired: true,
      dedupeKey: isStripeCheck
        ? "payment:stripe-connection-check"
        : "admin:error-resolution",
    });
    return apiErrorResponse(error);
  }
}
