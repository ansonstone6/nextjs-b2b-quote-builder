import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const materials = await prisma.material.findMany({
    orderBy: [{ inStock: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(
    materials.map((m) => ({
      id: m.id,
      name: m.name,
      pricePerFoot: m.pricePerFoot?.toString() ?? null,
      supplier: m.supplier,
      profileWidthInches: m.profileWidthInches?.toString() ?? null,
      inStock: m.inStock,
    })),
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      pricePerFoot?: number | string | null;
      supplier?: string | null;
      profileWidthInches?: number | string | null;
      inStock?: boolean;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const created = await prisma.material.create({
      data: {
        name: body.name.trim(),
        costPerAreaUnit: 0,
        areaUnitLabel: "sq_in",
        pricePerFoot:
          body.pricePerFoot === null || body.pricePerFoot === undefined || body.pricePerFoot === ""
            ? null
            : Number(body.pricePerFoot),
        supplier: body.supplier?.trim() || null,
        profileWidthInches:
          body.profileWidthInches === null ||
          body.profileWidthInches === undefined ||
          body.profileWidthInches === ""
            ? null
            : Number(body.profileWidthInches),
        inStock: body.inStock ?? true,
      },
    });
    return NextResponse.json({
      id: created.id,
      name: created.name,
      pricePerFoot: created.pricePerFoot?.toString() ?? null,
      supplier: created.supplier,
      profileWidthInches: created.profileWidthInches?.toString() ?? null,
      inStock: created.inStock,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create material" }, { status: 500 });
  }
}
