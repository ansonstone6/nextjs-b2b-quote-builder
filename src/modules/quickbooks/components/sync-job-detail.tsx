"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type JobDetail = {
  id: string;
  status: string;
  retryCount: number;
  lastError: string | null;
  idempotencyKey: string;
  startedAt: string | null;
  completedAt: string | null;
  quote: { id: string; quoteNumber: string; status: string; client: string; grandTotal: string };
  externalRefs: { entityType: string; externalId: string; externalUrl: string | null }[];
  logs: {
    id: string;
    step: string;
    level: string;
    message: string;
    createdAt: string;
  }[];
};

export function SyncJobDetail({ initial }: { initial: JobDetail }) {
  const router = useRouter();
  const [job, setJob] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quickbooks/jobs/${job.id}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Retry failed");
        return;
      }
      router.refresh();
      const detail = await fetch(`/api/quickbooks/jobs/${job.id}`);
      setJob(await detail.json());
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const invoice = job.externalRefs.find((r) => r.entityType === "invoice");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Job {job.id.slice(0, 8)}… · {job.quote.quoteNumber}
          </CardTitle>
          <CardDescription>Idempotency: {job.idempotencyKey}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{job.status}</Badge>
            <Badge variant="secondary">Retries: {job.retryCount}</Badge>
          </div>
          <p>Client: {job.quote.client}</p>
          <p>Total: {job.quote.grandTotal}</p>
          {job.startedAt ? <p>Started: {new Date(job.startedAt).toLocaleString()}</p> : null}
          {job.completedAt ? <p>Completed: {new Date(job.completedAt).toLocaleString()}</p> : null}
          {job.lastError ? <p className="text-destructive">{job.lastError}</p> : null}
          {invoice ? (
            <p>
              QuickBooks invoice: <code>{invoice.externalId}</code>
              {invoice.externalUrl ? (
                <>
                  {" "}
                  <a href={invoice.externalUrl} target="_blank" rel="noreferrer" className="underline">
                    Open
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {job.status === "failed" ? (
            <Button type="button" onClick={retry} disabled={busy}>
              {busy ? "Retrying…" : "Manual retry"}
            </Button>
          ) : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          <Link href={`/quotes/${job.quote.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Open quote
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync logs</CardTitle>
          <CardDescription>OAuth, token refresh, customer search/create, invoice create, failures, retries.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {job.logs.map((log) => (
              <li key={log.id} className="rounded-md border p-3">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{log.step}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className={log.level === "error" ? "text-destructive mt-1" : "mt-1"}>{log.message}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
