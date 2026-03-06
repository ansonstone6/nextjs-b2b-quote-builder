import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/modules/quickbooks/lib/oauth";
import { getQboConfig } from "@/modules/quickbooks/lib/config";

export async function GET(req: Request) {
  const cfg = getQboConfig();
  const origin = new URL(req.url).origin;
  const fallbackRedirect = `${origin}/api/quickbooks/auth/callback`;

  if (!cfg.configured) {
    const connectUrl = new URL("/quickbooks/connect", origin);
    connectUrl.searchParams.set("error", cfg.validation.errors[0] ?? "not_configured");
    return NextResponse.redirect(connectUrl);
  }

  if (cfg.redirectUri !== fallbackRedirect) {
    const connectUrl = new URL("/quickbooks/connect", origin);
    connectUrl.searchParams.set(
      "error",
      `redirect_mismatch: QBO_REDIRECT_URI must be ${fallbackRedirect} (matches this dev server). Update .env.local and Intuit app Redirect URIs.`,
    );
    return NextResponse.redirect(connectUrl);
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("qbo_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authorizeUrl = buildAuthorizeUrl(state);
  return NextResponse.redirect(authorizeUrl);
}
