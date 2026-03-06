import { NextResponse } from "next/server";
import { getQuoteSyncState } from "@/modules/quickbooks/lib/sync";

type RouteParams = { params: Promise<{ quoteId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { quoteId } = await params;
  const state = await getQuoteSyncState(quoteId);
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
