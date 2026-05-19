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

  // --- Clients (NYC luxury B2B)
  const [maison, halden] = await prisma.$transaction([
    prisma.client.create({
      data: {
        companyName: "Maison Avery Couture",
        contactName: "Camille Laurent",
        email: "production@maison-avery.example",
        phone: "+1 212 555 0142",
        billingLine1: "550 W 27th St, 5th Floor",
        billingCity: "New York",
        billingState: "NY",
        billingPostal: "10001",
        billingCountry: "US",
      },
    }),
    prisma.client.create({
      data: {
        companyName: "Halden Contemporary Gallery",
        contactName: "Jordan Ahmadi",
        email: "studio@halden-contemporary.example",
        phone: "+1 212 555 0188",
        billingLine1: "24 W 57th St",
        billingCity: "New York",
        billingState: "NY",
        billingPostal: "10019",
        billingCountry: "US",
      },
    }),
  ]);

  // --- Mouldings (materials). Per-foot pricing; supplier + profile width surfaced in catalog.
  const [walnut2, blackMaple15, gildedOrnate3, oakNatural, ebonized125, brushedAluminum] =
    await prisma.$transaction([
      prisma.material.create({
        data: {
          name: "Walnut 2\" Profile",
          costPerAreaUnit: 0,
          areaUnitLabel: "sq_in",
          pricePerFoot: 24,
          supplier: "Larson-Juhl",
          profileWidthInches: 2,
          inStock: true,
        },
      }),
      prisma.material.create({
        data: {
          name: "Black Maple 1.5\" Profile",
          costPerAreaUnit: 0,
          areaUnitLabel: "sq_in",
          pricePerFoot: 18,
          supplier: "Larson-Juhl",
          profileWidthInches: 1.5,
          inStock: true,
        },
      }),
      prisma.material.create({
        data: {
          name: "Gilded Ornate 3\" Profile",
          costPerAreaUnit: 0,
          areaUnitLabel: "sq_in",
          pricePerFoot: 62,
          supplier: "Roma Moulding",
          profileWidthInches: 3,
          inStock: true,
        },
      }),
      prisma.material.create({
        data: {
          name: "Oak Natural 1.75\" Profile",
          costPerAreaUnit: 0,
          areaUnitLabel: "sq_in",
          pricePerFoot: 21,
          supplier: "Bella Moulding",
          profileWidthInches: 1.75,
          inStock: true,
        },
      }),
      prisma.material.create({
        data: {
          name: "Ebonized 1.25\" Profile",
          costPerAreaUnit: 0,
          areaUnitLabel: "sq_in",
          pricePerFoot: 16,
          supplier: "Larson-Juhl",
          profileWidthInches: 1.25,
          inStock: true,
        },
      }),
      prisma.material.create({
        data: {
          name: "Brushed Aluminum 0.75\" Profile",
          costPerAreaUnit: 0,
          areaUnitLabel: "sq_in",
          pricePerFoot: 28,
          supplier: "Nielsen Bainbridge",
          profileWidthInches: 0.75,
          inStock: false,
        },
      }),
    ]);

  // --- Products
  const customFrame = await prisma.product.create({
    data: {
      name: "Custom Frame",
      description:
        "Built-to-spec wooden frame with mat, glazing, and mounting. Dimensions are the visible artwork size in inches.",
      dimensionUnitLabel: "in",
      areaUnitLabel: "sq_in",
      active: true,
    },
  });

  const floatMount = await prisma.product.create({
    data: {
      name: "Float Mount",
      description:
        "Artwork floated on a recessed backing inside a deeper frame, with reveal on all sides.",
      dimensionUnitLabel: "in",
      areaUnitLabel: "sq_in",
      active: true,
    },
  });

  const shadowBox = await prisma.product.create({
    data: {
      name: "Shadow Box",
      description:
        "Deep frame for three-dimensional pieces (textiles, garments, objects). Internal depth up to 3\".",
      dimensionUnitLabel: "in",
      areaUnitLabel: "sq_in",
      active: true,
    },
  });

  // --- Options. Glass + mat are priced PER SQUARE FOOT (area modifier).
  // Mount + hardware are flat fees per piece. Rush is a percentage of subtotal.
  const customFrameOpts = await prisma.$transaction([
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Regular glass",
        modifierType: OptionModifierType.area,
        modifierValue: 6,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Conservation Clear glass",
        modifierType: OptionModifierType.area,
        modifierValue: 14,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Museum glass (anti-reflective, UV)",
        modifierType: OptionModifierType.area,
        modifierValue: 35,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Optium acrylic",
        modifierType: OptionModifierType.area,
        modifierValue: 42,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "4-ply white mat",
        modifierType: OptionModifierType.area,
        modifierValue: 5,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "8-ply rag mat (archival)",
        modifierType: OptionModifierType.area,
        modifierValue: 12,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Double mat (8-ply over 4-ply)",
        modifierType: OptionModifierType.area,
        modifierValue: 18,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Dry mount on archival board",
        modifierType: OptionModifierType.fixed,
        modifierValue: 60,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Hinge mount (Japanese paper)",
        modifierType: OptionModifierType.fixed,
        modifierValue: 85,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Hidden cleat hanging system",
        modifierType: OptionModifierType.fixed,
        modifierValue: 45,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: customFrame.id,
        name: "Rush production (5 business days)",
        modifierType: OptionModifierType.percent,
        modifierValue: 18,
      },
    }),
  ]);

  const floatMountOpts = await prisma.$transaction([
    prisma.productOption.create({
      data: {
        productId: floatMount.id,
        name: "Museum glass (anti-reflective, UV)",
        modifierType: OptionModifierType.area,
        modifierValue: 35,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: floatMount.id,
        name: "Optium acrylic",
        modifierType: OptionModifierType.area,
        modifierValue: 42,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: floatMount.id,
        name: "Float mount on rag board",
        modifierType: OptionModifierType.fixed,
        modifierValue: 110,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: floatMount.id,
        name: "Hidden cleat hanging system",
        modifierType: OptionModifierType.fixed,
        modifierValue: 45,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: floatMount.id,
        name: "Rush production (5 business days)",
        modifierType: OptionModifierType.percent,
        modifierValue: 18,
      },
    }),
  ]);

  const shadowBoxOpts = await prisma.$transaction([
    prisma.productOption.create({
      data: {
        productId: shadowBox.id,
        name: "Museum glass (anti-reflective, UV)",
        modifierType: OptionModifierType.area,
        modifierValue: 38,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: shadowBox.id,
        name: "Custom interior fabric lining",
        modifierType: OptionModifierType.fixed,
        modifierValue: 140,
      },
    }),
    prisma.productOption.create({
      data: {
        productId: shadowBox.id,
        name: "Hidden cleat hanging system",
        modifierType: OptionModifierType.fixed,
        modifierValue: 60,
      },
    }),
  ]);

  // --- Pricing rules. Moulding billed by perimeter foot (uses material.pricePerFoot).
  // Minimums + volume + ornate-profile finish premium stay as before.
  await prisma.pricingRule.createMany({
    data: [
      // Custom Frame
      {
        productId: customFrame.id,
        priority: 10,
        ruleType: PricingRuleType.base_per_perimeter,
        amount: 0, // use material.pricePerFoot
        label: "Moulding (per linear foot)",
      },
      {
        productId: customFrame.id,
        priority: 5,
        ruleType: PricingRuleType.minimum_line,
        amount: 285,
        label: "Minimum frame charge",
      },
      {
        productId: customFrame.id,
        priority: 3,
        ruleType: PricingRuleType.volume_discount_percent,
        amount: 8,
        minQuantity: 6,
        label: "Volume rate (6+ frames)",
      },
      {
        productId: customFrame.id,
        priority: 1,
        ruleType: PricingRuleType.material_adjustment_percent,
        amount: 22,
        materialId: gildedOrnate3.id,
        label: "Gilded ornate profile finish",
      },
      // Float Mount
      {
        productId: floatMount.id,
        priority: 10,
        ruleType: PricingRuleType.base_per_perimeter,
        amount: 0,
        label: "Moulding (per linear foot)",
      },
      {
        productId: floatMount.id,
        priority: 5,
        ruleType: PricingRuleType.minimum_line,
        amount: 340,
        label: "Minimum float mount charge",
      },
      {
        productId: floatMount.id,
        priority: 3,
        ruleType: PricingRuleType.volume_discount_percent,
        amount: 6,
        minQuantity: 6,
        label: "Volume rate (6+ frames)",
      },
      // Shadow Box
      {
        productId: shadowBox.id,
        priority: 10,
        ruleType: PricingRuleType.base_per_perimeter,
        amount: 0,
        label: "Moulding (per linear foot)",
      },
      {
        productId: shadowBox.id,
        priority: 5,
        ruleType: PricingRuleType.minimum_line,
        amount: 480,
        label: "Minimum shadow box charge",
      },
    ],
  });

  await prisma.laborRule.createMany({
    data: [
      {
        productId: customFrame.id,
        label: "Bench labor (cut, join, fit)",
        setupAmount: 35,
        hourlyRate: 78,
        minutesPerAreaUnit: 0.012,
      },
      {
        productId: floatMount.id,
        label: "Float build labor",
        setupAmount: 55,
        hourlyRate: 82,
        minutesPerAreaUnit: 0.018,
      },
      {
        productId: shadowBox.id,
        label: "Shadow box build labor",
        setupAmount: 90,
        hourlyRate: 88,
        minutesPerAreaUnit: 0.024,
      },
    ],
  });

  // --- Sample quote 1: Draft for Maison Avery (couture lookbook prints)
  const draftQuote = await prisma.quote.create({
    data: {
      clientId: maison.id,
      quoteNumber: "QUO-2026-00001",
      status: QuoteStatus.draft,
      currency: "USD",
      taxRatePercent: 8.875,
      notes:
        "FW26 lookbook - archival pigment prints. Delivery to W 27th St loading dock. Confirm crating before invoice.",
    },
  });

  const museumGlassCF = customFrameOpts.find((o) => o.name.startsWith("Museum glass"))!;
  const ragMatCF = customFrameOpts.find((o) => o.name.startsWith("8-ply rag mat"))!;
  const dryMountCF = customFrameOpts.find((o) => o.name.startsWith("Dry mount"))!;
  const cleatFM = floatMountOpts.find((o) => o.name.startsWith("Hidden cleat"))!;
  const museumGlassFM = floatMountOpts.find((o) => o.name.startsWith("Museum glass"))!;

  await prisma.quoteItem.createMany({
    data: [
      {
        quoteId: draftQuote.id,
        productId: customFrame.id,
        materialId: walnut2.id,
        label: "FW26 Lookbook - archival print, walnut 2\" profile",
        width: 32,
        height: 40,
        quantity: 6,
        optionIds: [museumGlassCF.id, ragMatCF.id, dryMountCF.id],
        sortOrder: 0,
      },
      {
        quoteId: draftQuote.id,
        productId: floatMount.id,
        materialId: blackMaple15.id,
        label: "Editorial cover - float mount, black maple",
        width: 24,
        height: 30,
        quantity: 2,
        optionIds: [museumGlassFM.id, cleatFM.id],
        sortOrder: 1,
      },
    ],
  });

  await prisma.quoteStatusHistory.create({
    data: { quoteId: draftQuote.id, toStatus: QuoteStatus.draft, note: "Drafted from client brief" },
  });

  await recalculateQuote(draftQuote.id);

  // --- Sample quote 2: Converted to order (gallery installation, last quarter)
  const convertedQuote = await prisma.quote.create({
    data: {
      clientId: halden.id,
      quoteNumber: "QUO-2026-00002",
      status: QuoteStatus.converted,
      currency: "USD",
      taxRatePercent: 8.875,
      notes: "Gallery rotation - completed and delivered.",
    },
  });

  await prisma.quoteItem.create({
    data: {
      quoteId: convertedQuote.id,
      productId: customFrame.id,
      materialId: gildedOrnate3.id,
      label: "Spring rotation - gilded ornate 3\" profile",
      width: 36,
      height: 48,
      quantity: 4,
      optionIds: [museumGlassCF.id, ragMatCF.id],
      sortOrder: 0,
    },
  });

  await prisma.order.create({
    data: { quoteId: convertedQuote.id, clientId: halden.id, status: OrderStatus.open },
  });

  await prisma.quoteStatusHistory.createMany({
    data: [
      { quoteId: convertedQuote.id, toStatus: QuoteStatus.draft },
      { quoteId: convertedQuote.id, fromStatus: QuoteStatus.draft, toStatus: QuoteStatus.approved },
      {
        quoteId: convertedQuote.id,
        fromStatus: QuoteStatus.approved,
        toStatus: QuoteStatus.converted,
        note: "Converted to production order",
      },
    ],
  });

  await recalculateQuote(convertedQuote.id);

  // --- Sample quote 3: Approved, ready for QuickBooks sync demo
  const approvedQuote = await prisma.quote.create({
    data: {
      clientId: maison.id,
      quoteNumber: "QUO-2026-00003",
      status: QuoteStatus.approved,
      currency: "USD",
      taxRatePercent: 8.875,
      notes: "Approved by client - ready to invoice via QuickBooks.",
    },
  });

  const shadowMuseumGlass = shadowBoxOpts.find((o) => o.name.startsWith("Museum glass"))!;
  const shadowLining = shadowBoxOpts.find((o) => o.name.startsWith("Custom interior"))!;
  const cleatSB = shadowBoxOpts.find((o) => o.name.startsWith("Hidden cleat"))!;

  await prisma.quoteItem.createMany({
    data: [
      {
        quoteId: approvedQuote.id,
        productId: customFrame.id,
        materialId: walnut2.id,
        label: "Boutique installation - archival print, walnut 2\" profile",
        width: 28,
        height: 36,
        quantity: 8,
        optionIds: [museumGlassCF.id, ragMatCF.id, dryMountCF.id],
        sortOrder: 0,
      },
      {
        quoteId: approvedQuote.id,
        productId: shadowBox.id,
        materialId: blackMaple15.id,
        label: "Archive garment - shadow box, black maple",
        width: 30,
        height: 42,
        quantity: 1,
        optionIds: [shadowMuseumGlass.id, shadowLining.id, cleatSB.id],
        sortOrder: 1,
      },
    ],
  });

  await prisma.quoteStatusHistory.createMany({
    data: [
      { quoteId: approvedQuote.id, toStatus: QuoteStatus.draft },
      {
        quoteId: approvedQuote.id,
        fromStatus: QuoteStatus.draft,
        toStatus: QuoteStatus.approved,
        note: "Client approval received - ready for QuickBooks sync",
      },
    ],
  });

  await recalculateQuote(approvedQuote.id);

  console.log("Seed OK - custom framing catalog (6 mouldings, perimeter pricing, glass+mat per sq ft)");
  // Silence unused-var warnings for materials only referenced in seed metadata
  void oakNatural;
  void ebonized125;
  void brushedAluminum;
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
