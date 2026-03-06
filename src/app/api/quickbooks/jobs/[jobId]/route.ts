import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ jobId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const job = await prisma.syncJob.findUnique({
    where: { id: jobId },
    include: {
      quote: {
        include: {
          client: true,
          externalRefs: { where: { provider: "quickbooks" } },
        },
      },
      connection: true,
      logs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: job.id,
    status: job.status,
    retryCount: job.retryCount,
    lastError: job.lastError,
    idempotencyKey: job.idempotencyKey,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    quote: {
      id: job.quote.id,
      quoteNumber: job.quote.quoteNumber,
      status: job.quote.status,
      client: job.quote.client.companyName,
      grandTotal: job.quote.grandTotal.toString(),
    },
    externalRefs: job.quote.externalRefs.map((r) => ({
      entityType: r.entityType,
      externalId: r.externalId,
      externalUrl: r.externalUrl,
    })),
    connection: {
      realmId: job.connection.realmId,
      companyName: job.connection.companyName,
    },
    logs: job.logs.map((l) => ({
      id: l.id,
      step: l.step,
      level: l.level,
      message: l.message,
      payload: l.payload,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
