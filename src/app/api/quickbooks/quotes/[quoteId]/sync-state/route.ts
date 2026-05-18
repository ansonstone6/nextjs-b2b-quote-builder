import { NextResponse } from "next/server";
import { getQuoteSyncState } from "@/modules/quickbooks/lib/sync";
import { getActiveQuickBooksConnection } from "@/modules/quickbooks/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

type RouteParams = { params: Promise<{ quoteId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { quoteId } = await params;
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveQuickBooksConnection(demoSessionId);
  const state = await getQuoteSyncState(quoteId, connection?.id ?? null);
  return NextResponse.json({
    invoiceId: state.invoiceRef?.externalId ?? null,
    invoiceUrl: state.invoiceRef?.externalUrl ?? null,
    customerId: state.customerRef?.externalId ?? null,
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
