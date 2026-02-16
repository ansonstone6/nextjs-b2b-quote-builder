import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeQuote } from "@/lib/quotes/serialize";
import { QuoteEditor } from "@/components/quotes/quote-editor";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function QuotePage({ params }: PageProps) {
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
    notFound();
  }

  return <QuoteEditor initial={serializeQuote(quote)} />;
}
