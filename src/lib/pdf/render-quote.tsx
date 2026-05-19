import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf";
import { serializeQuote } from "@/lib/quotes/serialize";

/**
 * Server-side renderer for a quote PDF, used by both the GET /pdf route and
 * the Monday sync (which attaches the file to a board item). Returns the raw
 * bytes plus a suggested filename.
 */
export async function renderQuotePdf(quoteId: string): Promise<{
  filename: string;
  bytes: Uint8Array;
  mimeType: "application/pdf";
} | null> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      items: {
        include: { product: { include: { options: true } }, material: true },
        orderBy: { sortOrder: "asc" },
      },
      order: { select: { id: true, status: true } },
    },
  });
  if (!quote) return null;
  const brand = process.env.QUOTING_BRAND_NAME ?? "Custom Framing Studio";
  const buffer = await renderToBuffer(
    <QuotePdfDocument brand={brand} quote={serializeQuote(quote)} />,
  );
  return {
    filename: `${quote.quoteNumber}.pdf`,
    bytes: new Uint8Array(buffer),
    mimeType: "application/pdf",
  };
}
