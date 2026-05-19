import { NextResponse } from "next/server";
import {
  getActiveMondayConnection,
  getDecryptedMondayToken,
} from "@/modules/monday/lib/connection-store";
import { listBoards, MondayError } from "@/modules/monday/lib/monday-client";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export async function GET() {
  try {
    const demoSessionId = await ensureDemoSessionId();
    const conn = await getActiveMondayConnection(demoSessionId);
    if (!conn) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }
    const token = await getDecryptedMondayToken(conn);
    const boards = await listBoards(token);
    return NextResponse.json({ boards });
  } catch (e) {
    const msg =
      e instanceof MondayError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Failed to list boards";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
