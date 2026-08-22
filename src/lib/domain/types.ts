export type DataSource = "firestore" | "demo" | "unavailable";

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

export type AdminDashboardData = {
  currentWeek: RevenueStats;
  allTime: RevenueStats;
  listings: AdminListing[];
  recentBids: BidActivity[];
  settings: BoardSettings;
  weekId: string;
  nextResetAt: string;
};

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  minBidCents: 5_000,
  minIncrementCents: 100,
  checkoutCloseMinutes: 30,
  currency: "usd",
};
