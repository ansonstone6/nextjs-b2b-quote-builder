import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [products, materials] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: {
          options: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              modifierType: true,
              modifierValue: true,
            },
          },
        },
      }),
      prisma.material.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        dimensionUnitLabel: p.dimensionUnitLabel,
        areaUnitLabel: p.areaUnitLabel,
        options: p.options.map((o) => ({
          id: o.id,
          name: o.name,
          modifierType: o.modifierType,
          modifierValue: o.modifierValue.toString(),
        })),
      })),
      materials: materials.map((m) => ({
        id: m.id,
        name: m.name,
        costPerAreaUnit: m.costPerAreaUnit.toString(),
        areaUnitLabel: m.areaUnitLabel,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}
