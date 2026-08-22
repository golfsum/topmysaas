import "server-only";

import { createHash } from "node:crypto";

export function listingIdForUrl(normalizedUrl: string): string {
  return createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 40);
}

export function listingTombstoneId(
  weekId: string,
  normalizedUrl: string,
): string {
  return `${weekId}_${listingIdForUrl(normalizedUrl)}`;
}
