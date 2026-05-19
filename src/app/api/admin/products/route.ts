import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { options: { orderBy: { name: "asc" } } },
  });
  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      options: p.options.map((o) => ({
        id: o.id,
        name: o.name,
        modifierType: o.modifierType,
        modifierValue: o.modifierValue.toString(),
      })),
    })),
  );
}
