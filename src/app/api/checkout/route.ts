import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { CheckoutResponse } from "@/lib/domain/types";
import {
  ApiError,
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/server/api-error";
import { createCheckout } from "@/lib/server/checkout-service";
import {
  recordApiErrorEvent,
  requestIdFrom,
} from "@/lib/server/error-events";
import {
  getOrCreateOwnerToken,
  hashOwnerToken,
  OWNER_TOKEN_COOKIE,
  ownerTokenCookieOptions,
} from "@/lib/server/owner-token";

function checkoutRateLimitKey(
  request: NextRequest,
  ownerTokenHash: string,
): string {
  const forwardedAddress =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip");
  const address = forwardedAddress?.split(",")[0]?.trim() || ownerTokenHash;
  const configuredSalt = process.env.RATE_LIMIT_SALT?.trim();
  if (process.env.NODE_ENV === "production" && !configuredSalt) {
    throw new ApiError(
      503,
      "RATE_LIMIT_NOT_CONFIGURED",
      "Checkout abuse protection is not configured.",
    );
  }
  const salt =
    configuredSalt ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    "topmysaas-checkout";
  return createHash("sha256")
    .update(`${salt}:${address}`)
    .digest("hex")
    .slice(0, 40);
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const owner = getOrCreateOwnerToken(
      request.cookies.get(OWNER_TOKEN_COOKIE)?.value,
    );
    const ownerTokenHash = hashOwnerToken(owner.token);
    const result = await createCheckout(
      body,
      owner.token,
      ownerTokenHash,
      request.nextUrl.origin,
      checkoutRateLimitKey(request, ownerTokenHash),
    );
    const responseBody: CheckoutResponse = {
      checkoutUrl: result.checkoutUrl,
      chargedTodayCents: result.chargedTodayCents,
      targetTotalCents: result.targetTotalCents,
    };
    const response = NextResponse.json(responseBody, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set(
      OWNER_TOKEN_COOKIE,
      owner.token,
      ownerTokenCookieOptions(),
    );
    return response;
  } catch (error) {
    const code =
      error instanceof ApiError ? error.code : "CHECKOUT_INTERNAL_ERROR";
    await recordApiErrorEvent(error, {
      category: "checkout",
      severity:
        error instanceof ApiError && error.status >= 503
          ? "critical"
          : "error",
      operation: "create_checkout",
      requestId: requestIdFrom(request),
      actionRequired: true,
      retryable: true,
      dedupeKey: `checkout:${code}`,
    });
    return apiErrorResponse(error);
  }
}
