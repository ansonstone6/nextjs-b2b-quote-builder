import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMondayConfig } from "@/modules/monday/lib/config";
import { getActiveMondayConnection } from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MondayHubPage() {
  const cfg = getMondayConfig();
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveMondayConnection(demoSessionId);
  const syncJobsWhere = connection
    ? { connectionId: connection.id }
    : { connectionId: "00000000-0000-0000-0000-000000000000" };
  const [orderCount, syncJobCount, recentJobs] = await Promise.all([
    prisma.order.count(),
    prisma.syncJob.count({ where: syncJobsWhere }),
    prisma.syncJob.findMany({
      where: syncJobsWhere,
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { quote: { select: { quoteNumber: true } } },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Monday.com integration</h1>
        <p className="text-muted-foreground text-sm">
          Approved orders push to a Monday board as production items, with the quote PDF
          attached. Idempotent jobs, retries, and per-order logs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Personal API token, stored encrypted at rest.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant={cfg.configured ? "secondary" : "destructive"}>
            {cfg.configured ? "TOKEN_ENCRYPTION_KEY set" : "Set TOKEN_ENCRYPTION_KEY"}
          </Badge>
          <Badge variant={connection ? "secondary" : "outline"}>
            {connection
              ? `Connected · ${connection.companyName ?? `account ${connection.realmId}`}`
              : "Not connected"}
          </Badge>
          {connection?.defaultBoardId ? (
            <Badge variant="outline">Default board · {connection.defaultBoardId}</Badge>
          ) : connection ? (
            <Badge variant="destructive">No board selected</Badge>
          ) : null}
          <Link href="/monday/connect" className={cn(buttonVariants())}>
            {connection ? "Manage connection" : "Connect Monday"}
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Each converted order becomes a Monday item.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">{orderCount}</p>
            <Link href="/monday/orders" className={cn(buttonVariants({ variant: "outline" }))}>
              View orders
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sync jobs</CardTitle>
            <CardDescription>Pending, running, success, failed (with retries).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{syncJobCount}</p>
          </CardContent>
        </Card>
      </div>

      {recentJobs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent sync activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {recentJobs.map((j) => (
                <li key={j.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {j.quote.quoteNumber} · <Badge variant="outline">{j.status}</Badge>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {j.updatedAt.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
