import { OrderStatus, QuoteStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeQuote } from "@/lib/quotes/serialize";
import { getActiveMondayConnection } from "@/modules/monday/lib/connection-store";
import { syncOrderToMonday } from "@/modules/monday/lib/sync";
import { ensureDemoSessionId } from "@/modules/quickbooks/lib/demo-session";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.status !== QuoteStatus.approved) {
      return NextResponse.json({ error: "Only approved quotes can become orders" }, { status: 409 });
    }
    if (quote.order) {
      return NextResponse.json({ error: "Order already exists for this quote" }, { status: 409 });
    }

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          quoteId: id,
          clientId: quote.clientId,
          status: OrderStatus.open,
        },
      }),
      prisma.quoteStatusHistory.create({
        data: {
          quoteId: id,
          fromStatus: QuoteStatus.approved,
          toStatus: QuoteStatus.converted,
          note: "Converted to order",
        },
      }),
      prisma.quote.update({
        where: { id },
        data: { status: QuoteStatus.converted },
      }),
    ]);

    // Fire-and-forget Monday push if the visitor has a connected board.
    // Failures are recorded on the sync_job row; the response itself does not wait.
    const demoSessionId = await ensureDemoSessionId();
    const mondayConn = await getActiveMondayConnection(demoSessionId);
    if (mondayConn?.defaultBoardId) {
      void syncOrderToMonday(order.id, { demoSessionId }).catch((e) => {
        console.error("[monday auto-sync] failed:", e);
      });
    }

    const fresh = await prisma.quote.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        items: { include: { product: { include: { options: true } }, material: true }, orderBy: { sortOrder: "asc" } },
        order: { select: { id: true, status: true } },
      },
    });
    return NextResponse.json(serializeQuote(fresh));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Convert failed" }, { status: 500 });
  }
}
