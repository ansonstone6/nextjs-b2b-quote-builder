import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function allocateQuoteNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  const candidate = `QUO-${y}-${suffix}`;
  const clash = await prisma.quote.findUnique({ where: { quoteNumber: candidate } });
  if (clash) {
    return allocateQuoteNumber();
  }
  return candidate;
}
