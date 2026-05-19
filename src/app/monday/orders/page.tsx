import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getActiveMondayConnection } from "@/modules/monday/lib/connection-store";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

export const dynamic = "force-dynamic";

export default async function MondayOrdersPage() {
  const demoSessionId = await ensureDemoSessionId();
  const connection = await getActiveMondayConnection(demoSessionId);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { companyName: true } },
      quote: {
        select: {
          quoteNumber: true,
          grandTotal: true,
          currency: true,
          externalRefs: {
            where: {
              provider: "monday",
              entityType: "board_item",
              connectionId: connection?.id ?? "00000000-0000-0000-0000-000000000000",
            },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders for Monday</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Each row shows whether the order has been pushed to the connected Monday board.
          </p>
        </div>
        <Link href="/monday" className={cn(buttonVariants({ variant: "outline" }))}>
          Monday hub
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Click an order to open the quote, where you can trigger a sync or retry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {orders.map((o) => {
                const ref = o.quote.externalRefs[0];
                return (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{o.quote.quoteNumber}</span>
                      <span className="text-muted-foreground"> · {o.client.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{o.status}</Badge>
                      {ref ? (
                        ref.externalUrl ? (
                          <a
                            href={ref.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-primary"
                          >
                            Monday item {ref.externalId}
                          </a>
                        ) : (
                          <Badge variant="outline">item {ref.externalId}</Badge>
                        )
                      ) : (
                        <Badge variant="outline">not synced</Badge>
                      )}
                      <span className="text-muted-foreground">
                        {o.quote.currency} {o.quote.grandTotal.toString()}
                      </span>
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
