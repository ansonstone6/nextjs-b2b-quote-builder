import { NextResponse } from "next/server";
import { getMe, MondayError } from "@/modules/monday/lib/monday-client";
import { saveMondayConnection } from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";
import { getMondayConfig } from "@/modules/monday/lib/config";

export async function POST(req: Request) {
  try {
    const cfg = getMondayConfig();
    if (!cfg.configured) {
      return NextResponse.json(
        { error: cfg.validation.errors[0] ?? "Monday is not configured" },
        { status: 400 },
      );
    }
    const body = (await req.json()) as { apiToken?: string };
    const apiToken = body.apiToken?.trim();
    if (!apiToken) {
      return NextResponse.json({ error: "apiToken is required" }, { status: 400 });
    }
    // Validate the token by calling `me`. If Monday rejects, we surface the
    // error before persisting anything.
    const me = await getMe(apiToken);
    const demoSessionId = await ensureDemoSessionId();
    const conn = await saveMondayConnection({
      accountId: me.account.id,
      accountName: me.account.name,
      accountSlug: me.account.slug,
      demoSessionId,
      apiToken,
    });
    return NextResponse.json({
      id: conn.id,
      accountId: conn.realmId,
      accountName: conn.companyName,
      defaultBoardId: conn.defaultBoardId,
      me: { id: me.id, name: me.name, email: me.email },
    });
  } catch (e) {
    const msg =
      e instanceof MondayError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Connect failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
