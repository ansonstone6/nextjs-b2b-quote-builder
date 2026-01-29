import type { QuoteItemComputed } from "./types";

export type DecimalLike = string | number | { toString(): string };

function num(v: DecimalLike): number {
  const s =
    typeof v === "object" && v !== null && "toString" in v ? v.toString() : String(v);
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export type MaterialRow = { id: string; costPerAreaUnit: DecimalLike };
export type OptionRow = {
  id: string;
  modifierType: "fixed" | "percent";
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

/**
 * Server-side pricing from relational rules. All amounts are in quote currency before tax.
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

  const baseRules = pricingRules
    .filter((r) => r.ruleType === "base_per_area")
    .sort((a, b) => b.priority - a.priority);

  let baseComponent = 0;
  for (const r of baseRules) {
    baseComponent += totalArea * num(r.amount);
  }

  const materialUnitCost = num(material.costPerAreaUnit);
  let materialComponent = totalArea * materialUnitCost;

  const matAdjRules = pricingRules.filter((r) => r.ruleType === "material_adjustment_percent");
  let materialAdjustment = 0;
  for (const r of matAdjRules) {
    if (r.materialId && r.materialId !== material.id) continue;
    const pct = num(r.amount) / 100;
    materialAdjustment += materialComponent * pct;
  }
  materialComponent += materialAdjustment;

  const preOptionSubtotal = baseComponent + materialComponent;
  let optionsComponent = 0;
  for (const opt of selectedOptions) {
    if (opt.modifierType === "fixed") {
      optionsComponent += num(opt.modifierValue) * quantity;
    } else {
      optionsComponent += preOptionSubtotal * (num(opt.modifierValue) / 100);
    }
  }

  let volumeDiscount = 0;
  const volRules = pricingRules.filter((r) => r.ruleType === "volume_discount_percent");
  for (const r of volRules) {
    const minQ = r.minQuantity ?? 0;
    if (quantity >= minQ && minQ > 0) {
      const slice = baseComponent + materialComponent + optionsComponent;
      volumeDiscount += slice * (num(r.amount) / 100);
    }
  }

  const afterVolume = baseComponent + materialComponent + optionsComponent - volumeDiscount;

  let laborComponent = 0;
  if (laborRule) {
    const setup = num(laborRule.setupAmount);
    const hourly = num(laborRule.hourlyRate);
    const minutesPerArea = num(laborRule.minutesPerAreaUnit);
    const laborHours = (minutesPerArea / 60) * totalArea;
    laborComponent = setup + laborHours * hourly;
  }

  const subtotalBeforeMinimum = afterVolume + laborComponent;

  const minRules = pricingRules.filter((r) => r.ruleType === "minimum_line");
  let minimumFloor = 0;
  for (const r of minRules) {
    minimumFloor = Math.max(minimumFloor, num(r.amount));
  }
  const lineTotalRaw = Math.max(subtotalBeforeMinimum, minimumFloor);
  const minimumFloorApplied = lineTotalRaw > subtotalBeforeMinimum ? lineTotalRaw - subtotalBeforeMinimum : 0;

  const rows: QuoteItemComputed["rows"] = [
    { key: "base", label: "Production rate (area)", amount: roundMoney(baseComponent) },
    { key: "material", label: "Material", amount: roundMoney(materialComponent) },
    { key: "options", label: "Add-ons", amount: roundMoney(optionsComponent) },
  ];
  if (volumeDiscount > 0) {
    rows.push({ key: "volume", label: "Volume adjustment", amount: -roundMoney(volumeDiscount) });
  }
  rows.push({ key: "labor", label: "Labor & setup", amount: roundMoney(laborComponent) });
  if (minimumFloorApplied > 0) {
    rows.push({ key: "minimum", label: "Minimum line amount", amount: roundMoney(minimumFloorApplied) });
  }

  return {
    areaPerUnit: roundMoney(areaPerUnit),
    totalArea: roundMoney(totalArea),
    baseComponent: roundMoney(baseComponent),
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
