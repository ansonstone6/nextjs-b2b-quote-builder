import { NextResponse } from "next/server";
import { syncQuoteToQuickBooks } from "@/modules/quickbooks/lib/sync";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { quoteId?: string };
    if (!body.quoteId) {
      return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
    }
    const demoSessionId = await ensureDemoSessionId();
    const result = await syncQuoteToQuickBooks(body.quoteId, { demoSessionId });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}
