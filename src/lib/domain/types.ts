export type DataSource = "firestore" | "demo" | "unavailable";

export const MAX_TARGETABLE_RANK = 250;

export type BoardSettings = {
  minBidCents: number;
  minIncrementCents: number;
  checkoutCloseMinutes: number;
  currency: "usd";
};

export type PublicListing = {
  id: string;
  name: string;
  url: string;
  description: string;
  bidAmountCents: number;
  createdAt: string;
  updatedAt: string;
};

export type LeaderboardSnapshot = {
  listings: PublicListing[];
  settings: BoardSettings;
  weekId: string;
  nextResetAt: string;
  generatedAt: string;
  source: DataSource;
};

export type CheckoutRequest = {
  name: string;
  url: string;
  description: string;
  targetTotalCents: number;
  targetRank?: number;
};

export type CheckoutResponse = {
  checkoutUrl: string;
  chargedTodayCents: number;
  targetTotalCents: number;
};

export type BidStatusResponse = {
  status: "pending" | "fulfilled" | "failed" | "expired";
  listing?: PublicListing;
  rank?: number | null;
  message?: string;
};

export type AdminListing = PublicListing & {
  weekId: string;
  isActive: boolean;
  clickCount: number;
  currentBoardClickCount: number;
  hiddenReason?: string;
  source: "checkout" | "admin";
};

export type BidActivity = {
  id: string;
  listingId: string;
  listingName: string;
  amountCents: number;
  resultingTotalCents: number;
  createdAt: string;
  stripeSessionId: string;
  weekId: string;
};

export type RevenueStats = {
  revenueCents: number;
  bidCount: number;
};

export type SystemErrorCategory =
  | "payment"
  | "checkout"
  | "webhook"
  | "firebase"
  | "admin"
  | "leaderboard"
  | "system";

export type SystemErrorSeverity = "warning" | "error" | "critical";
export type SystemErrorStatus = "open" | "resolved";

export type SystemErrorActivity = {
  id: string;
  category: SystemErrorCategory;
  severity: SystemErrorSeverity;
  status: SystemErrorStatus;
  code: string;
  operation: string;
  message: string;
  actionRequired: boolean;
  retryable: boolean;
  occurrenceCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
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
  resolvedAt?: string;
};

export type PaymentConfiguration = {
  stripeKeyConfigured: boolean;
  stripeMode: "live" | "test" | "unknown" | "unconfigured";
  webhookConfigured: boolean;
};

export type SystemErrorFeed = {
  errors: SystemErrorActivity[];
  paymentConfiguration: PaymentConfiguration;
  lastSuccessfulPaymentAt?: string;
  lastVerifiedWebhookAt?: string;
  lastVerifiedWebhookLivemode?: boolean;
  lastVerifiedWebhookEventType?: string;
  generatedAt: string;
};

export type StripeConnectionCheck = {
  reachable: true;
  checkedAt: string;
  responseTimeMs: number;
  stripeMode: PaymentConfiguration["stripeMode"];
};

export type AdminDashboardData = {
  currentWeek: RevenueStats;
  allTime: RevenueStats;
  currentBoardClickCount: number;
  listings: AdminListing[];
  recentBids: BidActivity[];
  settings: BoardSettings;
  weekId: string;
  nextResetAt: string;
};

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  minBidCents: 500,
  minIncrementCents: 100,
  checkoutCloseMinutes: 30,
  currency: "usd",
};
