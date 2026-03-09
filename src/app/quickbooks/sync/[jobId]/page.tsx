import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SyncJobDetail } from "@/modules/quickbooks/components/sync-job-detail";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ jobId: string }> };

export default async function SyncJobDetailPage({ params }: PageProps) {
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
      logs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!job) notFound();

  const initial = {
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
    logs: job.logs.map((l) => ({
      id: l.id,
      step: l.step,
      level: l.level,
      message: l.message,
      createdAt: l.createdAt.toISOString(),
    })),
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Sync log detail</h1>
        <Link href="/quickbooks/sync" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to dashboard
        </Link>
      </div>
      <SyncJobDetail initial={initial} />
    </main>
  );
}
