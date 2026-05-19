import { NextResponse } from "next/server";
import { syncOrderToMonday } from "@/modules/monday/lib/sync";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string };
    if (!body.orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }
    const demoSessionId = await ensureDemoSessionId();
    const result = await syncOrderToMonday(body.orderId, { demoSessionId });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}
