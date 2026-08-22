import "server-only";

import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import type {
  AdminListing,
  BidActivity,
  BoardSettings,
  PublicListing,
} from "@/lib/domain/types";
import { DEFAULT_BOARD_SETTINGS } from "@/lib/domain/types";
import { boardSettingsSchema } from "@/lib/domain/validation";

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }
  return new Date(0).toISOString();
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

export function mapPublicListing(
  snapshot: QueryDocumentSnapshot | DocumentSnapshot,
): PublicListing {
  const data: DocumentData = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: typeof data.name === "string" ? data.name : "Untitled product",
    url: typeof data.url === "string" ? data.url : "https://example.com",
    description: typeof data.description === "string" ? data.description : "",
    bidAmountCents: nonNegativeInteger(data.bidAmountCents),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function mapAdminListing(
  snapshot: QueryDocumentSnapshot | DocumentSnapshot,
): AdminListing {
  const data: DocumentData = snapshot.data() ?? {};
  return {
    ...mapPublicListing(snapshot),
    weekId: typeof data.weekId === "string" ? data.weekId : "",
    isActive: data.isActive === true,
    clickCount: 0,
    currentBoardClickCount: 0,
    ...(typeof data.hiddenReason === "string"
      ? { hiddenReason: data.hiddenReason }
      : {}),
    source: data.source === "admin" ? "admin" : "checkout",
  };
}

export function mapBidActivity(
  snapshot: QueryDocumentSnapshot | DocumentSnapshot,
): BidActivity {
  const data: DocumentData = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    listingId: typeof data.listingId === "string" ? data.listingId : "",
    listingName:
      typeof data.listingName === "string" ? data.listingName : "Unknown listing",
    amountCents: nonNegativeInteger(data.amountCents),
    resultingTotalCents: nonNegativeInteger(data.resultingTotalCents),
    createdAt: toIso(data.createdAt),
    stripeSessionId:
      typeof data.stripeSessionId === "string" ? data.stripeSessionId : snapshot.id,
    weekId: typeof data.weekId === "string" ? data.weekId : "",
  };
}

export function parseBoardSettings(data: unknown): BoardSettings {
  const result = boardSettingsSchema.safeParse(data);
  return result.success ? result.data : { ...DEFAULT_BOARD_SETTINGS };
}

export function valueToIso(value: unknown): string {
  return toIso(value);
}
