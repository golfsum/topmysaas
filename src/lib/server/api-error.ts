import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Check the submitted fields and try again.",
        code: "VALIDATION_ERROR",
        details: error.flatten(),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    { error: "The request could not be completed.", code: "INTERNAL_ERROR" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Send a valid JSON request body.");
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(403, "ORIGIN_REQUIRED", "This request origin is required.");
    }
    return;
  }

  try {
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const expectedOrigin = configuredOrigin
      ? new URL(configuredOrigin).origin
      : new URL(request.url).origin;

    if (new URL(origin).origin === expectedOrigin) return;
  } catch {
    // Malformed origins are rejected below.
  }

  throw new ApiError(403, "INVALID_ORIGIN", "This request origin is not allowed.");
}
