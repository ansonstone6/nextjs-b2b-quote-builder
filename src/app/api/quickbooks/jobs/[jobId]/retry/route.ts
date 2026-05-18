import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncQuoteToQuickBooks } from "@/modules/quickbooks/lib/sync";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status === "success") {
      return NextResponse.json({ error: "Job already succeeded" }, { status: 409 });
    }

    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: "pending", lastError: null },
    });

    const demoSessionId = await ensureDemoSessionId();
    const result = await syncQuoteToQuickBooks(job.quoteId, { retryJobId: jobId, demoSessionId });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Retry failed" },
      { status: 500 },
    );
  }
}
