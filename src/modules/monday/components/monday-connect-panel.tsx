"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Connection = {
  id: string;
  accountId: string;
  accountName: string | null;
  defaultBoardId: string | null;
  connectedAt: string;
};

type Board = { id: string; name: string; state: string };

export function MondayConnectPanel({
  configured,
  validationErrors,
  connection: initial,
}: {
  configured: boolean;
  validationErrors: string[];
  connection: Connection | null;
}) {
  const [connection, setConnection] = useState<Connection | null>(initial);
  const [apiToken, setApiToken] = useState("");
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/monday/boards");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not list boards");
        setBoards([]);
        return;
      }
      setBoards(data.boards);
    } catch {
      setError("Network error listing boards");
    }
  }, []);

  useEffect(() => {
    if (connection) loadBoards();
  }, [connection, loadBoards]);

  async function connect() {
    if (!apiToken.trim()) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/monday/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: apiToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connect failed");
        return;
      }
      setConnection({
        id: data.id,
        accountId: data.accountId,
        accountName: data.accountName,
        defaultBoardId: data.defaultBoardId,
        connectedAt: new Date().toISOString(),
      });
      setApiToken("");
      setInfo(`Connected as ${data.me.name} (${data.me.email})`);
    } catch {
      setError("Network error connecting");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect Monday? Synced item references are kept; you can reconnect later.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/monday/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Disconnect failed");
        return;
      }
      setConnection(null);
      setBoards(null);
      setInfo("Disconnected.");
    } finally {
      setBusy(false);
    }
  }

  async function selectBoard(boardId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/monday/default-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save board selection");
        return;
      }
      setConnection((c) => (c ? { ...c, defaultBoardId: data.defaultBoardId } : c));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection</CardTitle>
        <CardDescription>
          {connection
            ? "Connected. Pick a board and approved orders will sync there."
            : "Paste a Monday personal API token."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && validationErrors.length > 0 ? (
          <ul className="text-destructive list-disc space-y-1 pl-5 text-sm">
            {validationErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        {info ? <p className="text-sm text-green-700 dark:text-green-400">{info}</p> : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        {!connection ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="token">
              API token
            </label>
            <Input
              id="token"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="eyJ…"
              disabled={!configured || busy}
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">
              Get one from monday.com → click your avatar → <strong>Developers</strong> →{" "}
              <strong>My access tokens</strong>.
            </p>
            <Button
              type="button"
              onClick={connect}
              disabled={!configured || busy || apiToken.trim().length === 0}
            >
              {busy ? "Validating…" : "Connect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{connection.accountName ?? `account ${connection.accountId}`}</Badge>
              {connection.defaultBoardId ? (
                <Badge variant="outline">Board · {connection.defaultBoardId}</Badge>
              ) : (
                <Badge variant="destructive">No board selected</Badge>
              )}
              <Button type="button" size="sm" variant="outline" onClick={disconnect} disabled={busy}>
                Disconnect
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Default board</h3>
              <p className="text-muted-foreground text-xs">
                New approved orders will push to this board as items.
              </p>
              {boards === null ? (
                <p className="text-muted-foreground text-sm">Loading boards…</p>
              ) : boards.length === 0 ? (
                <p className="text-muted-foreground text-sm">No boards visible to this token.</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {boards.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{b.name}</span>
                        <span className="text-muted-foreground"> · id {b.id}</span>
                      </div>
                      {connection.defaultBoardId === b.id ? (
                        <Badge variant="secondary">Selected</Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => selectBoard(b.id)}
                        >
                          Use this board
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
