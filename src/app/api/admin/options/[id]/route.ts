import { NextResponse } from "next/server";
import { OptionModifierType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_TYPES: OptionModifierType[] = ["fixed", "percent", "area"];

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      name?: string;
      modifierType?: string;
      modifierValue?: number | string;
    };
    const data: Prisma.ProductOptionUpdateInput = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      data.name = body.name.trim();
    }
    if (body.modifierType !== undefined) {
      if (!VALID_TYPES.includes(body.modifierType as OptionModifierType)) {
        return NextResponse.json(
          { error: `modifierType must be one of: ${VALID_TYPES.join(", ")}` },
          { status: 400 },
        );
      }
      data.modifierType = body.modifierType as OptionModifierType;
    }
    if (body.modifierValue !== undefined) {
      const value = Number(body.modifierValue);
      if (!Number.isFinite(value)) {
        return NextResponse.json({ error: "modifierValue must be a number" }, { status: 400 });
      }
      data.modifierValue = value;
    }
    const updated = await prisma.productOption.update({ where: { id }, data });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      modifierType: updated.modifierType,
      modifierValue: updated.modifierValue.toString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update option" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    // optionIds is a JSON column on QuoteItem (no FK), so we check usage manually.
    // Postgres @> on a JSONB column with an array literal containing the id.
    const usage = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM quote_items
      WHERE option_ids @> ${JSON.stringify([id])}::jsonb
    `;
    const used = Number(usage[0]?.count ?? 0);
    if (used > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: in use by ${used} quote line${used === 1 ? "" : "s"}. Remove the option from those quotes first.`,
        },
        { status: 409 },
      );
    }
    await prisma.productOption.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete option" }, { status: 500 });
  }
}
