import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  exchangeAdminIdToken,
  getAdminSession,
  revokeCurrentAdminSession,
} from "@/lib/server/admin-auth";
import {
  apiErrorResponse,
  assertSameOrigin,
  readJson,
} from "@/lib/server/api-error";

const sessionRequestSchema = z.object({
  idToken: z.string().trim().min(100).max(10_000),
});

export async function GET() {
  try {
    return NextResponse.json(
      { authenticated: Boolean(await getAdminSession()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { idToken } = sessionRequestSchema.parse(await readJson(request));
    const sessionCookie = await exchangeAdminIdToken(idToken);
    const response = NextResponse.json(
      { ok: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      sessionCookie,
      adminSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await revokeCurrentAdminSession();
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      ...adminSessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
