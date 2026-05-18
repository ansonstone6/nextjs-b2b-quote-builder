import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Browser-scoped demo-session id, used to isolate QuickBooks connections between
 * visitors of the public demo. In a production deploy with real auth this would
 * be replaced by the authenticated user id.
 *
 * **Where the cookie is actually set:** `src/middleware.ts` issues this cookie on
 * the first request. Server Components in Next 16 cannot write cookies during
 * render - calling `cookies().set()` there throws (and used to trigger a
 * Turbopack panic). The helpers below are read-only from Server Components and
 * only attempt a write in Route Handler / Server Action contexts as a fallback
 * if middleware somehow didn't fire.
 */
const COOKIE_NAME = "qbo_demo_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function newSessionId(): string {
  return randomBytes(16).toString("hex");
}

/** Read the demo-session id if one is already set, otherwise return null. */
export async function readDemoSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Read the demo-session id. If middleware hasn't set one yet (rare - first
 * request before middleware response is committed), generate one and try to
 * persist it. The persist will succeed in Route Handlers / Server Actions and
 * silently no-op in Server Components.
 */
export async function ensureDemoSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = newSessionId();
  try {
    store.set(COOKIE_NAME, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
  } catch {
    // Server Components cannot set cookies during render. Middleware will set
    // the cookie on the next request; for this request we just return the
    // generated id so the page renders consistently.
  }
  return id;
}
