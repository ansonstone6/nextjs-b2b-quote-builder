import "./load-env";
import {
  OptionModifierType,
  OrderStatus,
  PricingRuleType,
  QuoteStatus,
} from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { recalculateQuote } from "../src/lib/pricing/recalculate-quote";

async function main() {
  await prisma.syncLog.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.externalReference.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.quoteStatusHistory.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.laborRule.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.product.deleteMany();
  await prisma.material.deleteMany();
  await prisma.client.deleteMany();

  const [c1, c2] = await Promise.all([
    prisma.client.create({
      data: {
        companyName: "Northfield Operations Ltd.",
        contactName: "Alex Morgan",
        email: "procurement@northfield.example",
        phone: "+1 555 0100",
        billingLine1: "1200 Commerce Way",
        billingCity: "Portland",
        billingState: "OR",
        billingPostal: "97201",
        billingCountry: "US",
      },
    }),
    prisma.client.create({
      data: {
        companyName: "Harbor Works Cooperative",
        contactName: "Jordan Lee",
        email: "orders@harborworks.example",
        phone: "+1 555 0101",
      },
    }),
  ]);

  const [mStd, mPrem] = await Promise.all([
    prisma.material.create({
      data: {
        name: "Standard stock",
        costPerAreaUnit: 12.5,
        areaUnitLabel: "sq_m",
      },
    }),
    prisma.material.create({
      data: {
        name: "Premium stock",
        costPerAreaUnit: 22.75,
        areaUnitLabel: "sq_m",
      },
    }),
  ]);

  const p1 = await prisma.product.create({
    data: {
      name: "Configurable assembly unit",
      description: "Flat dimensions define coverage area; quantity is unit count.",
      dimensionUnitLabel: "m",
      areaUnitLabel: "sq_m",
      active: true,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: "Surface panel run",
      description: "Width and height set the area per piece before quantity.",
      dimensionUnitLabel: "m",
      areaUnitLabel: "sq_m",
      active: true,
    },
  });

  await prisma.productOption.createMany({
    data: [
      {
        productId: p1.id,
        name: "Expedited handling",
        modifierType: OptionModifierType.fixed,
        modifierValue: 45,
      },
      {
        productId: p1.id,
        name: "Reinforced packaging",
        modifierType: OptionModifierType.percent,
        modifierValue: 6,
      },
      {
        productId: p2.id,
        name: "Edge treatment",
        modifierType: OptionModifierType.fixed,
        modifierValue: 18,
      },
      {
        productId: p2.id,
        name: "Extended warranty window",
        modifierType: OptionModifierType.percent,
        modifierValue: 4,
      },
    ],
  });

  await prisma.pricingRule.createMany({
    data: [
      {
        productId: p1.id,
        priority: 10,
        ruleType: PricingRuleType.base_per_area,
        amount: 95,
        label: "Base production rate",
      },
      {
        productId: p1.id,
        priority: 5,
        ruleType: PricingRuleType.minimum_line,
        amount: 320,
        label: "Minimum line total",
      },
      {
        productId: p1.id,
        priority: 2,
        ruleType: PricingRuleType.volume_discount_percent,
        amount: 5,
        minQuantity: 25,
        label: "Quantity adjustment",
      },
      {
        productId: p1.id,
        priority: 1,
        ruleType: PricingRuleType.material_adjustment_percent,
        amount: 8,
        materialId: mPrem.id,
        label: "Premium material adjustment",
      },
      {
        productId: p2.id,
        priority: 10,
        ruleType: PricingRuleType.base_per_area,
        amount: 62,
        label: "Base production rate",
      },
      {
        productId: p2.id,
        priority: 5,
        ruleType: PricingRuleType.minimum_line,
        amount: 180,
        label: "Minimum line total",
      },
      {
        productId: p2.id,
        priority: 2,
        ruleType: PricingRuleType.volume_discount_percent,
        amount: 4,
        minQuantity: 40,
        label: "Quantity adjustment",
      },
    ],
  });

  await prisma.laborRule.createMany({
    data: [
      {
        productId: p1.id,
        label: "Assembly labor",
        setupAmount: 85,
        hourlyRate: 72,
        minutesPerAreaUnit: 4.5,
      },
      {
        productId: p2.id,
        label: "Panel labor",
        setupAmount: 40,
        hourlyRate: 68,
        minutesPerAreaUnit: 2.8,
      },
    ],
  });

  const quote = await prisma.quote.create({
    data: {
      clientId: c1.id,
      quoteNumber: "QUO-2026-00001",
      status: QuoteStatus.draft,
      currency: "USD",
      taxRatePercent: 7.5,
      notes: "Sample draft for demonstration.",
    },
  });

  await prisma.quoteItem.create({
    data: {
      quoteId: quote.id,
      productId: p1.id,
      materialId: mStd.id,
      label: "Line 1",
      width: 1.2,
      height: 0.9,
      quantity: 4,
      optionIds: [],
      sortOrder: 0,
    },
  });

  await prisma.quoteStatusHistory.create({
    data: {
      quoteId: quote.id,
      toStatus: QuoteStatus.draft,
      note: "Created from seed",
    },
  });

  await recalculateQuote(quote.id);

  const convertedQuote = await prisma.quote.create({
    data: {
      clientId: c2.id,
      quoteNumber: "QUO-2026-00002",
      status: QuoteStatus.converted,
      currency: "USD",
      taxRatePercent: 0,
      subtotal: 540,
      taxAmount: 0,
      grandTotal: 540,
    },
  });

  await prisma.order.create({
    data: {
      quoteId: convertedQuote.id,
      clientId: c2.id,
      status: OrderStatus.open,
    },
  });

  await prisma.quoteStatusHistory.createMany({
    data: [
      {
        quoteId: convertedQuote.id,
        toStatus: QuoteStatus.draft,
      },
      {
        quoteId: convertedQuote.id,
        fromStatus: QuoteStatus.draft,
        toStatus: QuoteStatus.approved,
      },
      {
        quoteId: convertedQuote.id,
        fromStatus: QuoteStatus.approved,
        toStatus: QuoteStatus.converted,
        note: "Converted to order (seed)",
      },
    ],
  });

  const approvedQuote = await prisma.quote.create({
    data: {
      clientId: c1.id,
      quoteNumber: "QUO-2026-00003",
      status: QuoteStatus.approved,
      currency: "USD",
      taxRatePercent: 7.5,
      notes: "Ready for QuickBooks invoice sync (seed).",
    },
  });

  await prisma.quoteItem.create({
    data: {
      quoteId: approvedQuote.id,
      productId: p2.id,
      materialId: mPrem.id,
      label: "Services package",
      width: 2,
      height: 1.5,
      quantity: 2,
      optionIds: [],
      sortOrder: 0,
    },
  });

  await prisma.quoteStatusHistory.createMany({
    data: [
      { quoteId: approvedQuote.id, toStatus: QuoteStatus.draft },
      {
        quoteId: approvedQuote.id,
        fromStatus: QuoteStatus.draft,
        toStatus: QuoteStatus.approved,
        note: "Approved for QuickBooks sync demo",
      },
    ],
  });

  await recalculateQuote(approvedQuote.id);

  console.log("Seed OK");
}


main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
