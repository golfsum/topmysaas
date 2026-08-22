import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { ApiError, apiErrorResponse } from "@/lib/server/api-error";
import {
  fulfillCheckoutSession,
  markCheckoutSession,
} from "@/lib/server/checkout-service";
import { getStripe, getStripeWebhookSecret } from "@/lib/server/stripe";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new ApiError(
        400,
        "STRIPE_SIGNATURE_REQUIRED",
        "The Stripe-Signature header is required.",
      );
    }

    const rawBody = await request.text();
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        getStripeWebhookSecret(),
      );
    } catch {
      throw new ApiError(
        400,
        "INVALID_STRIPE_SIGNATURE",
        "The Stripe webhook signature is invalid.",
      );
    }

    const session = event.data.object as Stripe.Checkout.Session;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfillCheckoutSession(session.id, event.id);
        break;
      case "checkout.session.async_payment_failed":
        await markCheckoutSession(session, "failed");
        break;
      case "checkout.session.expired":
        await markCheckoutSession(session, "expired");
        break;
      default:
        break;
    }

    return NextResponse.json(
      { received: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
