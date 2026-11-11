import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, COOKIE_OPTIONS } from "@/lib/auth";
import { authProvider } from "@/lib/auth/provider";
import { needsSignupName } from "@/lib/auth/signup-name";
import { ROLES } from "@/types";
import { recordUserAuditEventSafely } from "@/lib/repositories/audit.repository";

function redirect(request: NextRequest, destination: string) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirect(request, "/signin?error=oauth_failed");

  try {
    const user = await authProvider.completeOAuth(
      code,
      request.nextUrl.searchParams.get("state"),
    );
    await recordUserAuditEventSafely(user, {
      action: "authentication.signed_in",
      targetType: "session",
      metadata: { provider: "google" },
    });
    const destination = needsSignupName(user)
      ? "/signup"
      : user.role === ROLES.ALUMNI
        ? "/alumni"
        : "/admin";
    const response = redirect(request, destination);
    response.cookies.set(AUTH_COOKIE, "1", {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "";
    const reason = message.includes("OAuth state")
      ? "invalid_oauth_state"
      : "oauth_failed";
    return redirect(request, `/signin?error=${reason}`);
  }
}
