import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

export type ListingDocument = {
  name: string;
  url: string;
  normalizedUrl: string;
  description: string;
  bidAmountCents: number;
  bidAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  weekId: string;
  boardGeneration: number;
  ownerTokenHash?: string;
  hiddenReason?: string;
  source: "checkout" | "admin";
};

export type BidIntentStatus =
  | "pending"
  | "checkout_created"
  | "fulfilled"
  | "failed"
  | "expired";

export type BidIntentDocument = {
  listingId: string;
  name: string;
  url: string;
  normalizedUrl: string;
  description: string;
  ownerTokenHash: string;
  acceptedRemovalId?: string;
  weekId: string;
  boardGeneration: number;
  targetTotalCents: number;
  targetRank?: number;
  requiredTargetCentsAtCreation?: number;
  baseTotalCents: number;
  amountDueCents: number;
  startsNewPeriod: boolean;
  status: BidIntentStatus;
  stripeSessionId?: string;
  failureMessage?: string;
  resultingTotalCents?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  fulfilledAt?: Timestamp;
};

export type CheckoutSessionDocument = {
  bidIntentId: string;
  listingId: string;
  weekId: string;
  status: BidIntentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type BidDocument = {
  listingId: string;
  listingName: string;
  amountCents: number;
  amount: number;
  resultingTotalCents: number;
  createdAt: Timestamp;
  stripeSessionId: string;
  stripeEventId: string;
  weekId: string;
  appliedToActiveBoard: boolean;
};
