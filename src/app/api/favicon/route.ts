import { NextRequest } from "next/server";

import { publicFaviconHostname } from "@/lib/domain/listing-favicon";

export const runtime = "nodejs";

const MAX_FAVICON_BYTES = 128 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/vnd.microsoft.icon",
  "image/webp",
  "image/x-icon",
]);

function errorResponse(status: number) {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}

export async function GET(request: NextRequest) {
  const requestedDomain = request.nextUrl.searchParams.get("domain")?.trim();
  if (!requestedDomain || requestedDomain.length > 253) {
    return errorResponse(400);
  }

  const hostname = publicFaviconHostname(`https://${requestedDomain}`);
  if (!hostname || hostname !== requestedDomain.toLowerCase()) {
    return errorResponse(400);
  }

  const upstreamUrl = new URL("https://www.google.com/s2/favicons");
  upstreamUrl.searchParams.set("domain_url", `https://${hostname}`);
  upstreamUrl.searchParams.set("sz", "64");

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "image/png,image/webp,image/*;q=0.8" },
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!upstream.ok) return errorResponse(404);

    const contentType = upstream.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    const declaredLength = Number(upstream.headers.get("content-length") ?? 0);
    if (
      !contentType ||
      !ALLOWED_IMAGE_TYPES.has(contentType) ||
      (declaredLength > 0 && declaredLength > MAX_FAVICON_BYTES)
    ) {
      return errorResponse(404);
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_FAVICON_BYTES) {
      return errorResponse(404);
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "Content-Length": String(body.byteLength),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorResponse(404);
  }
}
