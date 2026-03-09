import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuickBooksQuotesPage() {
  const quotes = await prisma.quote.findMany({
    where: { status: { in: ["approved", "synced"] } },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { companyName: true, email: true } },
      externalRefs: { where: { provider: "quickbooks", entityType: "invoice" } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotes for QuickBooks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Approved quotes can be synced as invoices. Open a quote to sync or view existing references.
          </p>
        </div>
        <Link href="/quickbooks" className={cn(buttonVariants({ variant: "outline" }))}>
          QuickBooks hub
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved and synced</CardTitle>
          <CardDescription>
            Client name, email, billing address, line totals, tax, and grand total come from the quote
            record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No approved quotes yet.</p>
          ) : (
            <ul className="divide-y">
              {quotes.map((q) => {
                const inv = q.externalRefs[0];
                return (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <span className="font-medium">{q.quoteNumber}</span>
                      <span className="text-muted-foreground"> · {q.client.companyName}</span>
                      <p className="text-muted-foreground text-xs">{q.client.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{q.status}</Badge>
                      {inv ? (
                        <Badge variant="outline">QB invoice {inv.externalId}</Badge>
                      ) : null}
                      <span>
                        {q.currency} {q.grandTotal.toString()}
                      </span>
                      <Link href={`/quotes/${q.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
