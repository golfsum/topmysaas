import "server-only";

import Stripe from "stripe";

import { ApiError } from "./api-error";

let cachedStripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new ApiError(
      503,
      "STRIPE_NOT_CONFIGURED",
      "Payments are not configured for this environment.",
    );
  }

  cachedStripe = new Stripe(secretKey, { maxNetworkRetries: 2 });
  return cachedStripe;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new ApiError(
      503,
      "STRIPE_WEBHOOK_NOT_CONFIGURED",
      "The Stripe webhook is not configured.",
    );
  }
  return secret;
}
