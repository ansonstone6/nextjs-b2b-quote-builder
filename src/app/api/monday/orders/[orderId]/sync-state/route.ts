import { NextResponse } from "next/server";
import { getOrderSyncState } from "@/modules/monday/lib/sync";
import { getActiveMondayConnection } from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

type RouteParams = { params: Promise<{ orderId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { orderId } = await params;
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveMondayConnection(demoSessionId);
  const state = await getOrderSyncState(orderId, connection?.id ?? null);
  if (!state) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({
    itemId: state.ref?.externalId ?? null,
    itemUrl: state.ref?.externalUrl ?? null,
    job: state.latestJob
      ? {
          id: state.latestJob.id,
          status: state.latestJob.status,
          retryCount: state.latestJob.retryCount,
          lastError: state.latestJob.lastError,
        }
      : null,
  });
}
