import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const jobs = await prisma.syncJob.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      quote: { select: { id: true, quoteNumber: true, status: true } },
      connection: { select: { realmId: true, companyName: true } },
    },
  });
  return NextResponse.json(
    jobs.map((j) => ({
      id: j.id,
      quoteId: j.quoteId,
      quoteNumber: j.quote.quoteNumber,
      quoteStatus: j.quote.status,
      status: j.status,
      retryCount: j.retryCount,
      lastError: j.lastError,
      idempotencyKey: j.idempotencyKey,
      startedAt: j.startedAt?.toISOString() ?? null,
      completedAt: j.completedAt?.toISOString() ?? null,
      updatedAt: j.updatedAt.toISOString(),
      realmId: j.connection.realmId,
      companyName: j.connection.companyName,
    })),
  );
}
