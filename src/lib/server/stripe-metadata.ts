import "server-only";

import type Stripe from "stripe";

export const TOPMYSAAS_STRIPE_APP = "topmysaas_weekly_bid_v1";

export function isTopMySaasStripeMetadata(
  metadata: Stripe.Metadata | null | undefined,
): boolean {
  if (!metadata) return false;
  if (metadata.topmysaasApp === TOPMYSAAS_STRIPE_APP) return true;

  // Accept Checkout Sessions created just before the explicit app marker was
  // deployed. These three fields were already unique to TopMySaaS bids.
  return Boolean(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      metadata.bidIntentId ?? "",
    ) &&
      metadata.listingId &&
      /^\d{4}-\d{2}-\d{2}$/.test(metadata.weekId ?? ""),
  );
}
