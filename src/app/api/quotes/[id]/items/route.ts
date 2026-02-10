import { QuoteStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateQuote } from "@/lib/pricing/recalculate-quote";
import { serializeQuote } from "@/lib/quotes/serialize";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quote.status !== QuoteStatus.draft && quote.status !== QuoteStatus.sent) {
      return NextResponse.json({ error: "Quote is not editable" }, { status: 409 });
    }

    const body = (await req.json()) as {
      productId: string;
      materialId: string;
      width?: number;
      height?: number;
      quantity?: number;
      label?: string | null;
      optionIds?: string[];
    };

    if (!body.productId || !body.materialId) {
      return NextResponse.json({ error: "productId and materialId are required" }, { status: 400 });
    }

    const maxSort = await prisma.quoteItem.aggregate({
      where: { quoteId: id },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    await prisma.quoteItem.create({
      data: {
        quoteId: id,
        productId: body.productId,
        materialId: body.materialId,
        width: body.width ?? 1,
        height: body.height ?? 1,
        quantity: body.quantity ?? 1,
        label: body.label ?? null,
        optionIds: body.optionIds ?? [],
        sortOrder,
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
    return NextResponse.json({ error: "Failed to add line" }, { status: 500 });
  }
}
