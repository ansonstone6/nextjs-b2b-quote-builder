import { QuoteStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateQuote } from "@/lib/pricing/recalculate-quote";
import { serializeQuote } from "@/lib/quotes/serialize";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.status !== QuoteStatus.draft && quote.status !== QuoteStatus.sent) {
      return NextResponse.json({ error: "Only draft or sent quotes can be approved" }, { status: 409 });
    }

    await recalculateQuote(id);

    await prisma.quoteStatusHistory.create({
      data: {
        quoteId: id,
        fromStatus: quote.status,
        toStatus: QuoteStatus.approved,
        note: "Approved",
      },
    });

    await prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.approved },
    });

    const fresh = await prisma.quote.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        items: { include: { product: true, material: true }, orderBy: { sortOrder: "asc" } },
        order: { select: { id: true, status: true } },
      },
    });
    return NextResponse.json(serializeQuote(fresh));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Approve failed" }, { status: 500 });
  }
}
