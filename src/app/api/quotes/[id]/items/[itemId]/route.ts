import { QuoteStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateQuote } from "@/lib/pricing/recalculate-quote";
import { serializeQuote } from "@/lib/quotes/serialize";

type RouteParams = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id, itemId } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.status !== QuoteStatus.draft && quote.status !== QuoteStatus.sent) {
      return NextResponse.json({ error: "Quote is not editable" }, { status: 409 });
    }

    const item = await prisma.quoteItem.findFirst({ where: { id: itemId, quoteId: id } });
    if (!item) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      productId?: string;
      materialId?: string;
      width?: number;
      height?: number;
      quantity?: number;
      label?: string | null;
      optionIds?: string[];
    };

    await prisma.quoteItem.update({
      where: { id: itemId },
      data: {
        productId: body.productId,
        materialId: body.materialId,
        width: body.width,
        height: body.height,
        quantity: body.quantity,
        label: body.label !== undefined ? body.label : undefined,
        optionIds: body.optionIds !== undefined ? body.optionIds : undefined,
      },
    });

    await recalculateQuote(id);

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
    return NextResponse.json({ error: "Failed to update line" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id, itemId } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.status !== QuoteStatus.draft && quote.status !== QuoteStatus.sent) {
      return NextResponse.json({ error: "Quote is not editable" }, { status: 409 });
    }

    const item = await prisma.quoteItem.findFirst({ where: { id: itemId, quoteId: id } });
    if (!item) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    await prisma.quoteItem.delete({ where: { id: itemId } });
    await recalculateQuote(id);

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
    return NextResponse.json({ error: "Failed to delete line" }, { status: 500 });
  }
}
