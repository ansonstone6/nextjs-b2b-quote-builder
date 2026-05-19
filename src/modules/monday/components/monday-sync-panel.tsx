"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SyncState = {
  itemId: string | null;
  itemUrl: string | null;
  job: { id: string; status: string; retryCount: number; lastError: string | null } | null;
};

type MondayStatus = {
  configured: boolean;
  connected: boolean;
  connection: {
    id: string;
    accountId: string;
    accountName: string | null;
    defaultBoardId: string | null;
  } | null;
};

export function MondaySyncPanel({ orderId }: { orderId: string }) {
  const [mon, setMon] = useState<MondayStatus | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [statusRes, syncRes] = await Promise.all([
      fetch("/api/monday/status"),
      fetch(`/api/monday/orders/${orderId}/sync-state`),
    ]);
    setMon(await statusRes.json());
    if (syncRes.ok) {
      setSync(await syncRes.json());
    } else {
      setSync({ itemId: null, itemUrl: null, job: null });
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runSync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/monday/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
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
      const res = await fetch(`/api/monday/jobs/${sync.job.id}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Retry failed");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const noBoard = mon?.connected && !mon.connection?.defaultBoardId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monday.com production item</CardTitle>
        <CardDescription>
          Push this order to the connected board as a production item, with the quote PDF attached.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mon ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant={mon.configured ? "secondary" : "destructive"}>
              {mon.configured ? "Encryption key set" : "Not configured"}
            </Badge>
            <Badge variant={mon.connected ? "secondary" : "outline"}>
              {mon.connected ? "Connected" : "Not connected"}
            </Badge>
            {noBoard ? <Badge variant="destructive">No default board</Badge> : null}
            {sync?.job ? <Badge variant="outline">Last job: {sync.job.status}</Badge> : null}
          </div>
        ) : null}

        {sync?.itemId ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
            <p className="font-medium">Pushed to Monday</p>
            <p>
              Item ID: <code className="text-xs">{sync.itemId}</code>
            </p>
            {sync.itemUrl ? (
              <a
                href={sync.itemUrl}
                target="_blank"
                rel="noreferrer"
                className="underline text-primary"
              >
                Open item on Monday
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={runSync}
              disabled={busy || !mon?.connected || !mon?.connection?.defaultBoardId}
            >
              {busy ? "Syncing…" : "Push to Monday"}
            </Button>
            {!mon?.connected ? (
              <Link href="/monday/connect" className={cn(buttonVariants({ variant: "outline" }))}>
                Connect Monday
              </Link>
            ) : noBoard ? (
              <Link href="/monday/connect" className={cn(buttonVariants({ variant: "outline" }))}>
                Pick a board
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
            {sync.job.lastError ? ` — ${sync.job.lastError}` : ""}
          </p>
        ) : null}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
