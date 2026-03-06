import { NextResponse } from "next/server";
import { getQboConfig } from "@/modules/quickbooks/lib/config";
import { getActiveQuickBooksConnection } from "@/modules/quickbooks/lib/connection-store";

export async function GET() {
  const cfg = getQboConfig();
  const connection = await getActiveQuickBooksConnection();

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
