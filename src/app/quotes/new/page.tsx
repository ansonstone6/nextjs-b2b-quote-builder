"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ClientRow = { id: string; companyName: string; contactName: string; email: string };

export default function NewQuotePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [tax, setTax] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch(() => setError("Could not load clients"));
  }, []);

  async function create() {
    setError(null);
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          taxRatePercent: Number.parseFloat(tax) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Create failed");
        return;
      }
      router.push(`/quotes/${data.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <Card>
        <CardHeader>
          <CardTitle>New quote</CardTitle>
          <CardDescription>Choose a client. You can add line items on the next screen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="client">
              Client
            </label>
            <select
              id="client"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} - {c.contactName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="tax">
              Tax rate (%)
            </label>
            <Input
              id="tax"
              type="number"
              step="0.01"
              min="0"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" onClick={create} disabled={loading}>
              {loading ? "Creating…" : "Create quote"}
            </Button>
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
              Cancel
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
