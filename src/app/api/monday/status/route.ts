import { NextResponse } from "next/server";
import { getMondayConfig } from "@/modules/monday/lib/config";
import { getActiveMondayConnection } from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export async function GET() {
  const cfg = getMondayConfig();
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveMondayConnection(demoSessionId);
  return NextResponse.json({
    configured: cfg.configured,
    connected: !!connection,
    connection: connection
      ? {
          id: connection.id,
          accountId: connection.realmId,
          accountName: connection.companyName,
          defaultBoardId: connection.defaultBoardId,
          connectedAt: connection.connectedAt.toISOString(),
        }
      : null,
  });
}
