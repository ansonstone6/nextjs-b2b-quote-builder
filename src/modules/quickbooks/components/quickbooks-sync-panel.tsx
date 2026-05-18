"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SyncState = {
  invoiceId: string | null;
  invoiceUrl: string | null;
  customerId: string | null;
  job: { id: string; status: string; retryCount: number; lastError: string | null } | null;
};

type QboStatus = {
  configured: boolean;
  connected: boolean;
  environment: string;
};

export function QuickBooksSyncPanel({
  quoteId,
  quoteStatus,
}: {
  quoteId: string;
  quoteStatus: string;
}) {
  const [qbo, setQbo] = useState<QboStatus | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSync = quoteStatus === "approved" || quoteStatus === "synced";

  const load = useCallback(async () => {
    const [statusRes, syncRes] = await Promise.all([
      fetch("/api/quickbooks/status"),
      fetch(`/api/quickbooks/quotes/${quoteId}/sync-state`),
    ]);
    setQbo(await statusRes.json());
    setSync(await syncRes.json());
  }, [quoteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runSync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quickbooks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sync failed");
        await load();
        return;
      }
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!sync?.job?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quickbooks/jobs/${sync.job.id}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Retry failed");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (!canSync) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>QuickBooks invoice sync</CardTitle>
        <CardDescription>
          Sync this approved quote to QuickBooks Online as a customer invoice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qbo ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant={qbo.configured ? "secondary" : "destructive"}>
              {qbo.configured ? "OAuth configured" : "OAuth not configured"}
            </Badge>
            <Badge variant={qbo.connected ? "secondary" : "outline"}>
              {qbo.connected ? `Connected (${qbo.environment})` : "Not connected"}
            </Badge>
            {sync?.job ? <Badge variant="outline">Last job: {sync.job.status}</Badge> : null}
          </div>
        ) : null}

        {sync?.invoiceId ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
            <p className="font-medium">Already synced to QuickBooks</p>
            <p>
              Invoice ID: <code className="text-xs">{sync.invoiceId}</code>
            </p>
            {sync.customerId ? (
              <p>
                Customer ID: <code className="text-xs">{sync.customerId}</code>
              </p>
            ) : null}
            {sync.invoiceUrl ? (
              <a
                href={sync.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline text-primary"
              >
                Open in QuickBooks
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={runSync}
              disabled={busy || !qbo?.connected || !qbo?.configured}
            >
              {busy ? "Syncing…" : "Sync to QuickBooks"}
            </Button>
            {!qbo?.connected ? (
              <Link href="/quickbooks/connect" className={cn(buttonVariants({ variant: "outline" }))}>
                Connect QuickBooks
              </Link>
            ) : null}
          </div>
        )}

        {sync?.job?.status === "failed" ? (
          <Button type="button" variant="secondary" size="sm" onClick={retry} disabled={busy}>
            Retry sync
          </Button>
        ) : null}

        {sync?.job ? (
          <p className="text-muted-foreground text-xs">
            Job {sync.job.id.slice(0, 8)}… · {sync.job.status}
            {sync.job.lastError ? ` - ${sync.job.lastError}` : ""}{" "}
            <Link href={`/quickbooks/sync/${sync.job.id}`} className="underline">
              View logs
            </Link>
          </p>
        ) : null}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
