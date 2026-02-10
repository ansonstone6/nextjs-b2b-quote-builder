import { QuoteStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateQuote } from "@/lib/pricing/recalculate-quote";
import { serializeQuote } from "@/lib/quotes/serialize";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        items: { include: { product: true, material: true }, orderBy: { sortOrder: "asc" } },
        order: { select: { id: true, status: true } },
      },
    });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serializeQuote(quote));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load quote" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.status !== QuoteStatus.draft && quote.status !== QuoteStatus.sent) {
      return NextResponse.json({ error: "Quote is not editable in this status" }, { status: 409 });
    }

    const body = (await req.json()) as {
      notes?: string | null;
      taxRatePercent?: number;
      status?: QuoteStatus;
    };

    if (body.status !== undefined && body.status !== quote.status) {
      await prisma.quoteStatusHistory.create({
        data: {
          quoteId: id,
          fromStatus: quote.status,
          toStatus: body.status,
          note: "Status updated",
        },
      });
    }

    await prisma.quote.update({
      where: { id },
      data: {
        notes: body.notes !== undefined ? body.notes : undefined,
        taxRatePercent: body.taxRatePercent !== undefined ? body.taxRatePercent : undefined,
        status: body.status !== undefined ? body.status : undefined,
      },
    });

    await recalculateQuote(id);

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
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}
