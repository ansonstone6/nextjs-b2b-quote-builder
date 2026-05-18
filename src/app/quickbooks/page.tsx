import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveQuickBooksConnection } from "@/modules/quickbooks/lib/connection-store";
import { getQboConfig } from "@/modules/quickbooks/lib/config";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuickBooksHubPage() {
  const cfg = getQboConfig();
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveQuickBooksConnection(demoSessionId);
  // Sync stats are per-connection so each visitor sees only their own sync activity.
  const syncJobsWhere = connection
    ? { connectionId: connection.id }
    : { connectionId: "00000000-0000-0000-0000-000000000000" };
  const [approvedCount, syncJobCount, recentJobs] = await Promise.all([
    prisma.quote.count({ where: { status: { in: ["approved", "synced"] } } }),
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
        <h1 className="text-2xl font-semibold tracking-tight">QuickBooks integration</h1>
        <p className="text-muted-foreground text-sm">
          B2B quote-to-invoice workflow for a services company - connect QuickBooks Online, sync
          approved quotes, and track reliability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>OAuth 2.0 with encrypted token storage and automatic refresh.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant={cfg.configured ? "secondary" : "destructive"}>
            {cfg.configured ? "Credentials configured" : "Set QBO_* env vars"}
          </Badge>
          <Badge variant={connection ? "secondary" : "outline"}>
            {connection ? `Connected · realm ${connection.realmId}` : "Not connected"}
          </Badge>
          <Link href="/quickbooks/connect" className={cn(buttonVariants())}>
            {connection ? "Manage connection" : "Connect QuickBooks"}
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quotes ready to sync</CardTitle>
            <CardDescription>Approved quotes can become QuickBooks invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">{approvedCount}</p>
            <Link href="/quickbooks/quotes" className={cn(buttonVariants({ variant: "outline" }))}>
              View quotes
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sync jobs</CardTitle>
            <CardDescription>Pending, running, success, and failed runs with retries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold">{syncJobCount}</p>
            <Link href="/quickbooks/sync" className={cn(buttonVariants({ variant: "outline" }))}>
              Sync dashboard
            </Link>
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
                  <Link href={`/quickbooks/sync/${j.id}`} className="underline text-muted-foreground">
                    Logs
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Module map</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Link href="/quickbooks/connect" className="underline">
            Connection page
          </Link>
          <Link href="/quickbooks/quotes" className="underline">
            Quotes for sync
          </Link>
          <Link href="/quickbooks/sync" className="underline">
            Sync dashboard
          </Link>
          <Link href="/" className="underline">
            Main quote builder
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
