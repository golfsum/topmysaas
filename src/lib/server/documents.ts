import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import type {
  SystemErrorCategory,
  SystemErrorSeverity,
  SystemErrorStatus,
} from "@/lib/domain/types";

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

export type SystemErrorDocument = {
  category: SystemErrorCategory;
  severity: SystemErrorSeverity;
  status: SystemErrorStatus;
  code: string;
  operation: string;
  message: string;
  actionRequired: boolean;
  retryable: boolean;
  occurrenceCount: number;
  firstOccurredAt: Timestamp;
  lastOccurredAt: Timestamp;
  expiresAt: Timestamp;
  environment: string;
  httpStatus?: number;
  requestId?: string;
  weekId?: string;
  listingId?: string;
  bidIntentId?: string;
  stripeLivemode?: boolean;
  stripeEventId?: string;
  stripeEventType?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeRequestId?: string;
  stripeErrorType?: string;
  stripeErrorCode?: string;
  declineCode?: string;
  resolvedAt?: Timestamp;
};
