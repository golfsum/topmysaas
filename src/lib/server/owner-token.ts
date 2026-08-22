import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const OWNER_TOKEN_COOKIE = "topmysaas_owner";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createOwnerToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getOrCreateOwnerToken(candidate?: string): {
  token: string;
  isNew: boolean;
} {
  if (candidate && TOKEN_PATTERN.test(candidate)) {
    return { token: candidate, isNew: false };
  }
  return { token: createOwnerToken(), isNew: true };
}

export function hashOwnerToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function ownerTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    priority: "high" as const,
  };
}
