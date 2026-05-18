import { NextResponse } from "next/server";
import { getQboConfig } from "@/modules/quickbooks/lib/config";
import { getActiveQuickBooksConnection } from "@/modules/quickbooks/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export async function GET() {
  const cfg = getQboConfig();
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveQuickBooksConnection(demoSessionId);

  return NextResponse.json({
    configured: cfg.configured,
    connected: !!connection,
    environment: cfg.environment,
    connection: connection
      ? {
          id: connection.id,
          realmId: connection.realmId,
          companyName: connection.companyName,
          connectedAt: connection.connectedAt.toISOString(),
          accessTokenExpiresAt: connection.accessTokenExpiresAt.toISOString(),
        }
      : null,
  });
}
