const LISTING_DOCUMENT_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function isListingDocumentId(value: string): boolean {
  return LISTING_DOCUMENT_ID.test(value);
}

export function listingVisitPath(listingId: string): string {
  return `/go/${encodeURIComponent(listingId)}`;
}
