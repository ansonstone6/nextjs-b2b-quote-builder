import { prisma } from "@/lib/prisma";
import { computeLineTotal } from "./engine";

function num(v: string | number | { toString(): string }): number {
  const s = typeof v === "object" && v !== null && "toString" in v ? v.toString() : String(v);
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export async function recalculateQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { product: { include: { options: true } }, material: true },
      },
    },
  });

  if (!quote) {
    throw new Error("Quote not found");
  }

  const productIds = [...new Set(quote.items.map((i) => i.productId))];

  const [allRules, allLabor, allOptions] = await Promise.all([
    productIds.length
      ? prisma.pricingRule.findMany({ where: { productId: { in: productIds } } })
      : [],
    productIds.length
      ? prisma.laborRule.findMany({ where: { productId: { in: productIds } } })
      : [],
    productIds.length
      ? prisma.productOption.findMany({ where: { productId: { in: productIds } } })
      : [],
  ]);

  const rulesByProduct = new Map<string, typeof allRules>();
  for (const r of allRules) {
    const list = rulesByProduct.get(r.productId) ?? [];
    list.push(r);
    rulesByProduct.set(r.productId, list);
  }

  const laborByProduct = new Map<string, (typeof allLabor)[0]>();
  for (const l of allLabor) {
    if (!laborByProduct.has(l.productId)) laborByProduct.set(l.productId, l);
  }

  const optionsById = new Map(allOptions.map((o) => [o.id, o]));

  let subtotal = 0;

  for (const item of quote.items) {
    const width = num(item.width);
    const height = num(item.height);
    const qty = item.quantity;

    const rawOpt = item.optionIds;
    const optIds = Array.isArray(rawOpt) ? (rawOpt as string[]) : [];

    const selectedOptions = optIds
      .map((id) => optionsById.get(id))
      .filter((o): o is NonNullable<typeof o> => !!o && o.productId === item.productId);

    const productRules = rulesByProduct.get(item.productId) ?? [];
    const labor = laborByProduct.get(item.productId) ?? null;

    const computed = computeLineTotal({
      width,
      height,
      quantity: qty,
      currency: quote.currency,
      material: {
        id: item.material.id,
        name: item.material.name,
        costPerAreaUnit: item.material.costPerAreaUnit,
        pricePerFoot: item.material.pricePerFoot,
      },
      selectedOptions: selectedOptions.map((o) => ({
        id: o.id,
        name: o.name,
        modifierType: o.modifierType,
        modifierValue: o.modifierValue,
      })),
      pricingRules: productRules.map((r) => ({
        id: r.id,
        ruleType: r.ruleType,
        amount: r.amount,
        priority: r.priority,
        minQuantity: r.minQuantity,
        materialId: r.materialId,
        label: r.label,
      })),
      laborRule: labor
        ? {
            label: labor.label,
            setupAmount: labor.setupAmount,
            hourlyRate: labor.hourlyRate,
            minutesPerAreaUnit: labor.minutesPerAreaUnit,
          }
        : null,
    });

    subtotal += computed.lineTotal;

    await prisma.quoteItem.update({
      where: { id: item.id },
      data: {
        computed: computed as object,
        lineTotal: computed.lineTotal,
        updatedAt: new Date(),
      },
    });
  }

  const taxRate = num(quote.taxRatePercent) / 100;
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      updatedAt: new Date(),
    },
  });
}
