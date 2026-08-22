import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isListingDocumentId } from "@/lib/domain/listing-links";
import { recordPublicListingClick } from "@/lib/server/click-tracking";

export const dynamic = "force-dynamic";

const redirectHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

function temporaryRedirect(destination: URL | string): NextResponse {
  return NextResponse.redirect(destination, {
    status: 302,
    headers: redirectHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const { listingId } = await params;
  if (!isListingDocumentId(listingId)) {
    return temporaryRedirect(new URL("/", request.url));
  }

  try {
    const destination = await recordPublicListingClick(listingId);
    return temporaryRedirect(destination ?? new URL("/", request.url));
  } catch (error) {
    console.error("Unable to resolve outbound listing link", error);
    return temporaryRedirect(new URL("/", request.url));
  }
}
