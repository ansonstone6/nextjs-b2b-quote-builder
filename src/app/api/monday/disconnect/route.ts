import { NextResponse } from "next/server";
import {
  disconnectMonday,
  getActiveMondayConnection,
} from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export async function POST() {
  const demoSessionId = await ensureDemoSessionId();
  const conn = await getActiveMondayConnection(demoSessionId);
  if (!conn) {
    return NextResponse.json({ ok: true, alreadyDisconnected: true });
  }
  await disconnectMonday(conn.id);
  return NextResponse.json({ ok: true });
}
