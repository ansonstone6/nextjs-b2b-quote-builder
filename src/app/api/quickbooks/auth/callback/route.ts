import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/modules/quickbooks/lib/oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const error = url.searchParams.get("error");

  const base = new URL("/quickbooks/connect", url.origin);

  if (error) {
    base.searchParams.set("error", error);
    return NextResponse.redirect(base);
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get("qbo_oauth_state")?.value;
  cookieStore.delete("qbo_oauth_state");

  if (!code || !realmId || !state || state !== expected) {
    base.searchParams.set("error", "invalid_oauth_state");
    return NextResponse.redirect(base);
  }

  try {
    await exchangeAuthorizationCode(code, realmId);
    base.searchParams.set("connected", "1");
    return NextResponse.redirect(base);
  } catch (e) {
    base.searchParams.set("error", e instanceof Error ? e.message : "oauth_failed");
    return NextResponse.redirect(base);
  }
}
