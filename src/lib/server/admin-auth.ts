import "server-only";

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";

import { ApiError } from "./api-error";
import { getAdminAuth, isFirebaseAdminConfigured } from "./firebase-admin";

export const ADMIN_SESSION_COOKIE = "topmysaas_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

function configuredAdminUid(): string | undefined {
  return process.env.FIREBASE_ADMIN_UID?.trim();
}

function isConfiguredAdmin(token: DecodedIdToken): boolean {
  const uid = configuredAdminUid();
  return Boolean(uid && token.uid === uid);
}

export async function getAdminSession(): Promise<DecodedIdToken | null> {
  if (!isFirebaseAdminConfigured() || !configuredAdminUid()) return null;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return isConfiguredAdmin(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<DecodedIdToken> {
  const session = await getAdminSession();
  if (!session) {
    throw new ApiError(
      401,
      "ADMIN_AUTH_REQUIRED",
      "Sign in with the configured administrator account.",
    );
  }
  return session;
}

export async function revokeCurrentAdminSession(): Promise<void> {
  const session = await getAdminSession();
  if (session) {
    await getAdminAuth().revokeRefreshTokens(session.uid);
  }
}

export async function exchangeAdminIdToken(idToken: string): Promise<string> {
  if (!isFirebaseAdminConfigured() || !configuredAdminUid()) {
    throw new ApiError(
      503,
      "ADMIN_AUTH_NOT_CONFIGURED",
      "Administrator authentication is not configured.",
    );
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken, true);
  } catch {
    throw new ApiError(401, "INVALID_ID_TOKEN", "The Firebase ID token is invalid.");
  }

  if (!isConfiguredAdmin(decoded)) {
    throw new ApiError(
      403,
      "NOT_CONFIGURED_ADMIN",
      "This Firebase account is not authorized as the administrator.",
    );
  }

  const authenticatedAt = Number(decoded.auth_time ?? 0);
  if (Date.now() / 1_000 - authenticatedAt > 5 * 60) {
    throw new ApiError(
      401,
      "RECENT_LOGIN_REQUIRED",
      "Sign in again before starting an administrator session.",
    );
  }

  try {
    return await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS * 1_000,
    });
  } catch {
    throw new ApiError(
      401,
      "SESSION_CREATE_FAILED",
      "The administrator session could not be created.",
    );
  }
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    priority: "high" as const,
  };
}
