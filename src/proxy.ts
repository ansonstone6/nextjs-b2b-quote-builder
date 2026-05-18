import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "qbo_demo_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// 16 random bytes hex-encoded. Edge runtime has crypto.getRandomValues.
function newSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Proxy (the Next 16 replacement for middleware) issues the demo-session cookie
 * on first visit. Setting cookies inside Server Components throws in Next 16
 * (and was triggering a perceived reload loop), so we do it here once per browser.
 *
 * Skipped for static assets and Next internals so we don't churn ETags or hot-reload payloads.
 */
export function proxy(req: NextRequest) {
  if (req.cookies.has(COOKIE_NAME)) {
    return NextResponse.next();
  }
  const res = NextResponse.next();
  res.cookies.set(COOKIE_NAME, newSessionId(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}

export const config = {
  matcher: [
    // Run on every request except Next internals, static files, and the favicon.
    "/((?!_next/|favicon\\.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.ico$).*)",
  ],
};
