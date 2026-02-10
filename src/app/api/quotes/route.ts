import { QuoteStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocateQuoteNumber } from "@/lib/quotes/next-quote-number";
import { serializeQuote } from "@/lib/quotes/serialize";

export async function GET() {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        client: { select: { id: true, companyName: true } },
        order: { select: { id: true, status: true } },
      },
    });
    return NextResponse.json(
      quotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        currency: q.currency,
        subtotal: q.subtotal.toString(),
        taxAmount: q.taxAmount.toString(),
        grandTotal: q.grandTotal.toString(),
        updatedAt: q.updatedAt.toISOString(),
        client: q.client,
        hasOrder: !!q.order,
      })),
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list quotes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      clientId?: string;
      taxRatePercent?: number;
      notes?: string | null;
    };
    if (!body.clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: body.clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const quoteNumber = await allocateQuoteNumber();
    const quote = await prisma.quote.create({
      data: {
        clientId: body.clientId,
        quoteNumber,
        taxRatePercent: body.taxRatePercent ?? 0,
        notes: body.notes ?? null,
        status: QuoteStatus.draft,
      },
      include: {
        client: true,
        items: { include: { product: true, material: true }, orderBy: { sortOrder: "asc" } },
        order: { select: { id: true, status: true } },
      },
    });

    await prisma.quoteStatusHistory.create({
      data: {
        quoteId: quote.id,
        toStatus: QuoteStatus.draft,
        note: "Quote created",
      },
    });

    return NextResponse.json(serializeQuote(quote));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
