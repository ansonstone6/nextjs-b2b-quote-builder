import { NextResponse } from "next/server";
import { OptionModifierType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ productId: string }> };

const VALID_TYPES: OptionModifierType[] = ["fixed", "percent", "area"];

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { productId } = await params;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const body = (await req.json()) as {
      name?: string;
      modifierType?: string;
      modifierValue?: number | string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!body.modifierType || !VALID_TYPES.includes(body.modifierType as OptionModifierType)) {
      return NextResponse.json(
        { error: `modifierType must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    const value = Number(body.modifierValue);
    if (!Number.isFinite(value)) {
      return NextResponse.json({ error: "modifierValue must be a number" }, { status: 400 });
    }
    const created = await prisma.productOption.create({
      data: {
        productId,
        name: body.name.trim(),
        modifierType: body.modifierType as OptionModifierType,
        modifierValue: value,
      },
    });
    return NextResponse.json({
      id: created.id,
      name: created.name,
      modifierType: created.modifierType,
      modifierValue: created.modifierValue.toString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create option" }, { status: 500 });
  }
}
