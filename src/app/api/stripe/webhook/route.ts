import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { ApiError, apiErrorResponse } from "@/lib/server/api-error";
import {
  fulfillCheckoutSession,
  markCheckoutSession,
} from "@/lib/server/checkout-service";
import {
  recordApiErrorEvent,
  recordErrorEvent,
  recordVerifiedStripeWebhook,
  requestIdFrom,
  resolveErrorEventByDedupeKey,
} from "@/lib/server/error-events";
import { getStripe, getStripeWebhookSecret } from "@/lib/server/stripe";
import { isTopMySaasStripeMetadata } from "@/lib/server/stripe-metadata";

export async function POST(request: Request) {
  let event: Stripe.Event | undefined;

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
    const stripe = getStripe();
    const webhookSecret = getStripeWebhookSecret();
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      console.warn(
        JSON.stringify({
          level: "warning",
          event: "stripe_webhook_signature_rejected",
          requestId: requestIdFrom(request),
        }),
      );
      throw new ApiError(
        400,
        "INVALID_STRIPE_SIGNATURE",
        "The Stripe webhook signature is invalid.",
      );
    }
    await recordVerifiedStripeWebhook({
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
    });

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!isTopMySaasStripeMetadata(session.metadata)) break;
        await fulfillCheckoutSession(session.id, event.id);
        await Promise.all([
          resolveErrorEventByDedupeKey(
            `stripe:${event.id}:processing-failed`,
          ),
          resolveErrorEventByDedupeKey(
            `checkout:${session.id}:mapping-write`,
          ),
          resolveErrorEventByDedupeKey(
            `payment:${session.id}:confirmation-delayed`,
          ),
        ]);
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!isTopMySaasStripeMetadata(session.metadata)) break;
        await markCheckoutSession(session, "failed");
        await recordErrorEvent({
          category: "payment",
          severity: "warning",
          code: "STRIPE_ASYNC_PAYMENT_FAILED",
          operation: "process_async_payment_failure",
          message:
            "Stripe reported that an asynchronous payment failed. No ranking was granted.",
          retryable: false,
          actionRequired: false,
          stripeLivemode: event.livemode,
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripeSessionId: session.id,
          bidIntentId: session.metadata?.bidIntentId,
          listingId: session.metadata?.listingId,
          weekId: session.metadata?.weekId,
          dedupeKey: `stripe:${event.id}:async-payment-failed`,
        });
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!isTopMySaasStripeMetadata(session.metadata)) break;
        await markCheckoutSession(session, "expired");
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (!isTopMySaasStripeMetadata(paymentIntent.metadata)) break;
        await recordErrorEvent({
          category: "payment",
          severity: "warning",
          code: "STRIPE_PAYMENT_INTENT_FAILED",
          operation: "process_payment_intent_failure",
          message:
            "Stripe reported a failed payment attempt. No ranking was granted.",
          retryable: false,
          actionRequired: false,
          stripeLivemode: event.livemode,
          stripeEventId: event.id,
          stripeEventType: event.type,
          stripePaymentIntentId: paymentIntent.id,
          bidIntentId: paymentIntent.metadata?.bidIntentId,
          listingId: paymentIntent.metadata?.listingId,
          weekId: paymentIntent.metadata?.weekId,
          stripeErrorType: paymentIntent.last_payment_error?.type,
          stripeErrorCode: paymentIntent.last_payment_error?.code,
          declineCode: paymentIntent.last_payment_error?.decline_code,
          dedupeKey: `stripe:${event.id}:payment-intent-failed`,
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json(
      { received: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const eventObject = event?.data.object;
    const stripeSessionId =
      eventObject &&
      "object" in eventObject &&
      eventObject.object === "checkout.session"
        ? eventObject.id
        : undefined;
    const stripePaymentIntentId =
      eventObject &&
      "object" in eventObject &&
      eventObject.object === "payment_intent"
        ? eventObject.id
        : undefined;
    const code =
      error instanceof ApiError ? error.code : "WEBHOOK_PROCESSING_FAILED";
    await recordApiErrorEvent(error, {
      category: "webhook",
      severity: event ? "critical" : "error",
      operation: event
        ? `process_stripe_event:${event.type}`
        : "verify_stripe_webhook",
      requestId: requestIdFrom(request),
      actionRequired: true,
      retryable: true,
      stripeLivemode: event?.livemode,
      stripeEventId: event?.id,
      stripeEventType: event?.type,
      stripeSessionId,
      stripePaymentIntentId,
      dedupeKey: event
        ? `stripe:${event.id}:processing-failed`
        : `webhook:${code}`,
    });
    return apiErrorResponse(error);
  }
}
