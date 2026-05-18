import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf";
import { serializeQuote } from "@/lib/quotes/serialize";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        items: { include: { product: { include: { options: true } }, material: true }, orderBy: { sortOrder: "asc" } },
        order: { select: { id: true, status: true } },
      },
    });
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const brand = process.env.QUOTING_BRAND_NAME ?? "Custom Framing Studio";
    const serialized = serializeQuote(quote);
    const buffer = await renderToBuffer(<QuotePdfDocument brand={brand} quote={serialized} />);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.quoteNumber}.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
