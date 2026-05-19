import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      name?: string;
      pricePerFoot?: number | string | null;
      supplier?: string | null;
      profileWidthInches?: number | string | null;
      inStock?: boolean;
    };
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      data.name = body.name.trim();
    }
    if (body.pricePerFoot !== undefined) {
      data.pricePerFoot =
        body.pricePerFoot === null || body.pricePerFoot === ""
          ? null
          : Number(body.pricePerFoot);
    }
    if (body.supplier !== undefined) {
      data.supplier = body.supplier?.trim() || null;
    }
    if (body.profileWidthInches !== undefined) {
      data.profileWidthInches =
        body.profileWidthInches === null || body.profileWidthInches === ""
          ? null
          : Number(body.profileWidthInches);
    }
    if (body.inStock !== undefined) {
      data.inStock = !!body.inStock;
    }
    const updated = await prisma.material.update({ where: { id }, data });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      pricePerFoot: updated.pricePerFoot?.toString() ?? null,
      supplier: updated.supplier,
      profileWidthInches: updated.profileWidthInches?.toString() ?? null,
      inStock: updated.inStock,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    // Refuse if this material is referenced by any quote line or pricing rule;
    // otherwise deletion either fails the FK constraint or silently breaks
    // historical quotes. Admins should toggle inStock instead.
    const [usedByItems, usedByRules] = await Promise.all([
      prisma.quoteItem.count({ where: { materialId: id } }),
      prisma.pricingRule.count({ where: { materialId: id } }),
    ]);
    if (usedByItems > 0 || usedByRules > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: in use by ${usedByItems} quote line${usedByItems === 1 ? "" : "s"} and ${usedByRules} pricing rule${usedByRules === 1 ? "" : "s"}. Mark as out of stock instead.`,
        },
        { status: 409 },
      );
    }
    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
