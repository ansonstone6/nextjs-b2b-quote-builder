import type { QuoteItemComputed } from "./types";

export type DecimalLike = string | number | { toString(): string };

function num(v: DecimalLike | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const s =
    typeof v === "object" && v !== null && "toString" in v ? v.toString() : String(v);
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export type MaterialRow = {
  id: string;
  name?: string;
  costPerAreaUnit: DecimalLike;
  pricePerFoot?: DecimalLike | null;
};
export type OptionRow = {
  id: string;
  name?: string;
  modifierType: "fixed" | "percent" | "area";
  modifierValue: DecimalLike;
};
export type PricingRuleRow = {
  id: string;
  ruleType: string;
  amount: DecimalLike;
  priority: number;
  minQuantity: number | null;
  materialId: string | null;
  label: string | null;
};
export type LaborRuleRow = {
  setupAmount: DecimalLike;
  hourlyRate: DecimalLike;
  minutesPerAreaUnit: DecimalLike;
  label: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals).replace(/\.?0+$/, "");
}

/**
 * Server-side pricing from relational rules. All amounts are in quote currency before tax.
 *
 * Assumptions for framing products (dimensionUnitLabel == "in"):
 *   - Width/height are inches.
 *   - `base_per_perimeter` rules bill in linear feet (perimeter_inches / 12 × amount).
 *   - Options with modifierType `area` bill per square foot (area_sq_in / 144 × amount).
 *   - `base_per_area` keeps the original raw-area semantics for back-compat.
 *
 * The engine itself is product-agnostic: framing-ness is data (rule types + option types),
 * not code.
 */
export function computeLineTotal(input: {
  width: number;
  height: number;
  quantity: number;
  currency: string;
  material: MaterialRow;
  selectedOptions: OptionRow[];
  pricingRules: PricingRuleRow[];
  laborRule: LaborRuleRow | null;
}): QuoteItemComputed {
  const { width, height, quantity, currency, material, selectedOptions, pricingRules, laborRule } =
    input;

  const areaPerUnit = width * height;
  const totalArea = areaPerUnit * quantity;
  const perimeterPerUnitInches = 2 * (width + height);
  const totalPerimeterInches = perimeterPerUnitInches * quantity;
  const totalPerimeterFeet = totalPerimeterInches / 12;
  const totalAreaSqFt = totalArea / 144;

  // --- Base (per raw area) -- legacy. Most framing products use base_per_perimeter instead.
  const baseRules = pricingRules
    .filter((r) => r.ruleType === "base_per_area")
    .sort((a, b) => b.priority - a.priority);

  let baseComponent = 0;
  for (const r of baseRules) {
    baseComponent += totalArea * num(r.amount);
  }

  // --- Moulding (per linear foot). Uses material.pricePerFoot when available; otherwise
  //     falls back to the rule's `amount` (so the rule itself can carry a flat per-foot rate).
  const perimeterRules = pricingRules
    .filter((r) => r.ruleType === "base_per_perimeter")
    .sort((a, b) => b.priority - a.priority);
  let mouldingComponent = 0;
  let mouldingDetail: string | undefined;
  if (perimeterRules.length > 0) {
    const pricePerFoot = material.pricePerFoot != null ? num(material.pricePerFoot) : null;
    for (const r of perimeterRules) {
      const rate = pricePerFoot ?? num(r.amount);
      mouldingComponent += totalPerimeterFeet * rate;
      if (!mouldingDetail) {
        mouldingDetail = `${formatNumber(totalPerimeterFeet, 2)} ft × $${formatNumber(rate, 2)}/ft`;
      }
    }
  }

  // --- Material (per raw area, legacy) for non-moulding lines.
  const materialUnitCost = num(material.costPerAreaUnit);
  let materialComponent = totalArea * materialUnitCost;

  const matAdjRules = pricingRules.filter((r) => r.ruleType === "material_adjustment_percent");
  let materialAdjustment = 0;
  for (const r of matAdjRules) {
    if (r.materialId && r.materialId !== material.id) continue;
    const pct = num(r.amount) / 100;
    // Material adjustment applies to whichever component represents this material.
    // For framing lines (moulding via perimeter rules) -> applies to mouldingComponent.
    // For legacy lines -> applies to materialComponent.
    if (mouldingComponent > 0) {
      materialAdjustment += mouldingComponent * pct;
    } else {
      materialAdjustment += materialComponent * pct;
    }
  }
  if (mouldingComponent > 0) {
    mouldingComponent += materialAdjustment;
  } else {
    materialComponent += materialAdjustment;
  }

  // --- Options: fixed (× qty), percent (of pre-option subtotal), area (per sq ft of artwork).
  const preOptionSubtotal = baseComponent + mouldingComponent + materialComponent;
  let optionsComponent = 0;
  const optionDetails: { label: string; amount: number; detail: string }[] = [];
  for (const opt of selectedOptions) {
    if (opt.modifierType === "fixed") {
      const amt = num(opt.modifierValue) * quantity;
      optionsComponent += amt;
      if (opt.name) {
        optionDetails.push({
          label: opt.name,
          amount: amt,
          detail: quantity > 1 ? `$${formatNumber(num(opt.modifierValue), 2)} × ${quantity}` : "flat",
        });
      }
    } else if (opt.modifierType === "percent") {
      const amt = preOptionSubtotal * (num(opt.modifierValue) / 100);
      optionsComponent += amt;
      if (opt.name) {
        optionDetails.push({
          label: opt.name,
          amount: amt,
          detail: `${formatNumber(num(opt.modifierValue), 2)}% of subtotal`,
        });
      }
    } else if (opt.modifierType === "area") {
      const ratePerSqFt = num(opt.modifierValue);
      const amt = totalAreaSqFt * ratePerSqFt;
      optionsComponent += amt;
      if (opt.name) {
        optionDetails.push({
          label: opt.name,
          amount: amt,
          detail: `${formatNumber(totalAreaSqFt, 2)} sq ft × $${formatNumber(ratePerSqFt, 2)}/sq ft`,
        });
      }
    }
  }

  // --- Volume discount.
  let volumeDiscount = 0;
  const volRules = pricingRules.filter((r) => r.ruleType === "volume_discount_percent");
  for (const r of volRules) {
    const minQ = r.minQuantity ?? 0;
    if (quantity >= minQ && minQ > 0) {
      const slice = baseComponent + mouldingComponent + materialComponent + optionsComponent;
      volumeDiscount += slice * (num(r.amount) / 100);
    }
  }

  const afterVolume =
    baseComponent + mouldingComponent + materialComponent + optionsComponent - volumeDiscount;

  // --- Labor.
  let laborComponent = 0;
  let laborDetail: string | undefined;
  if (laborRule) {
    const setup = num(laborRule.setupAmount);
    const hourly = num(laborRule.hourlyRate);
    const minutesPerArea = num(laborRule.minutesPerAreaUnit);
    const laborHours = (minutesPerArea / 60) * totalArea;
    laborComponent = setup + laborHours * hourly;
    laborDetail = `setup $${formatNumber(setup, 2)} + ${formatNumber(laborHours, 2)} hr × $${formatNumber(hourly, 2)}/hr`;
  }

  const subtotalBeforeMinimum = afterVolume + laborComponent;

  // --- Minimum line.
  const minRules = pricingRules.filter((r) => r.ruleType === "minimum_line");
  let minimumFloor = 0;
  for (const r of minRules) {
    minimumFloor = Math.max(minimumFloor, num(r.amount));
  }
  const lineTotalRaw = Math.max(subtotalBeforeMinimum, minimumFloor);
  const minimumFloorApplied =
    lineTotalRaw > subtotalBeforeMinimum ? lineTotalRaw - subtotalBeforeMinimum : 0;

  // --- Build the breakdown rows shown in the UI + PDF.
  const rows: QuoteItemComputed["rows"] = [];
  if (mouldingComponent > 0) {
    rows.push({
      key: "moulding",
      label: material.name ? `Moulding - ${material.name}` : "Moulding",
      amount: roundMoney(mouldingComponent),
      detail: mouldingDetail,
    });
  }
  if (baseComponent > 0) {
    rows.push({ key: "base", label: "Production rate (area)", amount: roundMoney(baseComponent) });
  }
  if (materialComponent > 0 && mouldingComponent === 0) {
    rows.push({ key: "material", label: "Material", amount: roundMoney(materialComponent) });
  }
  for (const o of optionDetails) {
    rows.push({
      key: `option:${o.label}`,
      label: o.label,
      amount: roundMoney(o.amount),
      detail: o.detail,
    });
  }
  if (volumeDiscount > 0) {
    rows.push({ key: "volume", label: "Volume adjustment", amount: -roundMoney(volumeDiscount) });
  }
  if (laborComponent > 0) {
    rows.push({
      key: "labor",
      label: laborRule?.label ? `Labor - ${laborRule.label}` : "Labor & setup",
      amount: roundMoney(laborComponent),
      detail: laborDetail,
    });
  }
  if (minimumFloorApplied > 0) {
    rows.push({
      key: "minimum",
      label: "Minimum line amount",
      amount: roundMoney(minimumFloorApplied),
    });
  }

  return {
    areaPerUnit: roundMoney(areaPerUnit),
    totalArea: roundMoney(totalArea),
    perimeterPerUnitInches: roundMoney(perimeterPerUnitInches),
    totalPerimeterInches: roundMoney(totalPerimeterInches),
    baseComponent: roundMoney(baseComponent),
    mouldingComponent: roundMoney(mouldingComponent),
    materialComponent: roundMoney(materialComponent),
    optionsComponent: roundMoney(optionsComponent),
    laborComponent: roundMoney(laborComponent),
    volumeDiscount: roundMoney(volumeDiscount),
    materialAdjustment: roundMoney(materialAdjustment),
    subtotalBeforeMinimum: roundMoney(subtotalBeforeMinimum),
    minimumFloorApplied: roundMoney(minimumFloorApplied),
    lineTotal: roundMoney(lineTotalRaw),
    currency,
    rows,
  };
}
