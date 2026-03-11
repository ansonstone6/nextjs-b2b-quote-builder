import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      client: { select: { companyName: true } },
      order: { select: { id: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Open a quote to configure lines, pricing is calculated on the server.
          </p>
        </div>
        <Link href="/quotes/new" className={cn(buttonVariants())}>
          New quote
        </Link>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>Feature areas in this demo app.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-md border bg-card p-3 space-y-2">
            <p className="font-medium">Quote builder</p>
            <p className="text-muted-foreground">
              Configurable products, server-side pricing, PDF export, orders.
            </p>
            <Link href="/quotes/new" className="underline">
              Create quote
            </Link>
          </div>
          <div className="rounded-md border bg-card p-3 space-y-2">
            <p className="font-medium">QuickBooks invoice sync</p>
            <p className="text-muted-foreground">
              OAuth 2.0, encrypted tokens, quote-to-invoice with sync jobs and logs.
            </p>
            <Link href="/quickbooks" className="underline">
              Open QuickBooks module
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>Status and totals update after each save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes yet. Create one to get started.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/quotes/${q.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{q.quoteNumber}</span>
                    <span className="text-muted-foreground">{q.client.companyName}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">{q.status}</Badge>
                      {q.order ? <Badge variant="outline">Order</Badge> : null}
                      <span>
                        {q.currency} {q.grandTotal.toString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
