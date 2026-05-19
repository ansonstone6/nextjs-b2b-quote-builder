import { NextResponse } from "next/server";
import {
  getActiveMondayConnection,
  setDefaultBoardId,
} from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export async function POST(req: Request) {
  const demoSessionId = await ensureDemoSessionId();
  const conn = await getActiveMondayConnection(demoSessionId);
  if (!conn) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }
  const body = (await req.json()) as { boardId?: string | null };
  const boardId = body.boardId?.trim() || null;
  const updated = await setDefaultBoardId(conn.id, boardId);
  return NextResponse.json({ defaultBoardId: updated.defaultBoardId });
}
