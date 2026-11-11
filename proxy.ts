import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { AUTH_COOKIE } from "@/lib/auth";
import { InMemoryRateLimiter } from "@/lib/security/rate-limit";
import { classifyRateLimitedRequest } from "@/lib/security/rate-limit-policy";

const AUTH_ROUTES = ["/signin"];
const SESSION_OPTIONAL_API_ROUTES = new Set([
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/google-drive",
  "/api/auth/google-drive/callback",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/session-expired",
]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const rateLimiter = new InMemoryRateLimiter();

function rateLimitClient(request: NextRequest) {
  const trustProxyHeaders =
    process.env.VERCEL === "1" || process.env.TRUST_PROXY_HEADERS === "true";

  if (!trustProxyHeaders) {
    const session = request.cookies.get(AUTH_COOKIE)?.value;
    return session
      ? `session:${createHash("sha256").update(session).digest("base64url").slice(0, 22)}`
      : "untrusted-anonymous";
  }

  const candidates = [
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    request.headers.get("x-real-ip")?.trim(),
  ];

  const address = candidates.find((candidate) => candidate && isIP(candidate));
  if (address) return `ip:${address}`;

  const session = request.cookies.get(AUTH_COOKIE)?.value;
  return session
    ? `session:${createHash("sha256").update(session).digest("base64url").slice(0, 22)}`
    : "unknown-anonymous";
}

function rateLimitHeaders(result: ReturnType<InMemoryRateLimiter["consume"]>) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(
      Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
    ),
  };
}

function rateLimit(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestClass = classifyRateLimitedRequest(pathname, request.method);
  if (!requestClass) return null;

  const windowMs = requestClass === "auth" ? 10 * 60_000 : 60_000;
  const maximum =
    requestClass === "export" ? 10 : requestClass === "auth" ? 30 : 120;
  const key = `${rateLimitClient(request)}:${requestClass}`;
  const result = rateLimiter.consume(key, maximum, windowMs);
  const headers = rateLimitHeaders(result);
  if (!result.limited) return { response: null, headers };

  return {
    response: NextResponse.json(
      { success: false, message: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(result.retryAfterSeconds),
          "Cache-Control": "private, no-store",
        },
      },
    ),
    headers,
  };
}

function protectApiRequest(request: NextRequest) {
  const rateLimitResult = rateLimit(request);
  if (rateLimitResult?.response) return rateLimitResult.response;

  if (
    !SESSION_OPTIONAL_API_ROUTES.has(request.nextUrl.pathname) &&
    !request.cookies.get(AUTH_COOKIE)?.value
  ) {
    return NextResponse.json(
      { success: false, message: "Authentication is required." },
      { status: 401 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const isMultipart = request.headers
    .get("content-type")
    ?.startsWith("multipart/form-data");
  const maximumBytes = isMultipart ? 11 * 1024 * 1024 : 1024 * 1024;
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    return NextResponse.json(
      { success: false, message: "Request body is too large." },
      { status: 413 },
    );
  }

  if (MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { success: false, message: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }
  }

  const response = NextResponse.next();
  if (rateLimitResult) {
    for (const [name, value] of Object.entries(rateLimitResult.headers)) {
      response.headers.set(name, value);
    }
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) return protectApiRequest(request);

  // Sign-up supports both Google authentication and authenticated name entry.
  if (pathname === "/signup") return NextResponse.next();

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const hasSession = !!request.cookies.get(AUTH_COOKIE)?.value;

  if (!hasSession) {
    if (isAuthRoute) {
      return NextResponse.next();
    }

    const signInUrl = new URL("/signin", request.url);

    return NextResponse.redirect(signInUrl);
  }
  if (isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
