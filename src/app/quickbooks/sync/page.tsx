import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getActiveQuickBooksConnection } from "@/modules/quickbooks/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export const dynamic = "force-dynamic";

export default async function SyncDashboardPage() {
  // Demo-session scope: only show sync jobs for THIS visitor's connection.
  // Without a connection (visitor hasn't connected yet), the impossible-UUID
  // sentinel keeps Prisma happy and returns an empty list.
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveQuickBooksConnection(demoSessionId);
  const jobs = await prisma.syncJob.findMany({
    where: { connectionId: connection?.id ?? "00000000-0000-0000-0000-000000000000" },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { quote: { select: { quoteNumber: true, status: true } } },
  });

  const counts = {
    pending: jobs.filter((j) => j.status === "pending").length,
    running: jobs.filter((j) => j.status === "running").length,
    success: jobs.filter((j) => j.status === "success").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sync dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track sync jobs with idempotency keys, retries, and step-by-step logs.
          </p>
        </div>
        <Link href="/quickbooks" className={cn(buttonVariants({ variant: "outline" }))}>
          QuickBooks hub
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["pending", "running", "success", "failed"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs capitalize">{s}</p>
              <p className="text-2xl font-semibold">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All jobs</CardTitle>
          <CardDescription>Click a row for full sync log detail.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sync jobs yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <span className="font-medium">{j.quote.quoteNumber}</span>
                    <p className="text-muted-foreground text-xs font-mono">{j.idempotencyKey}</p>
                    {j.lastError ? (
                      <p className="text-destructive text-xs mt-1">{j.lastError}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{j.status}</Badge>
                    <span className="text-muted-foreground">retries {j.retryCount}</span>
                    <Link href={`/quickbooks/sync/${j.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                      Details
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
