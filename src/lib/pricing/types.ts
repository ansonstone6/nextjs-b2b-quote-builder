export type PricingRuleType =
  | "base_per_area"
  | "minimum_line"
  | "volume_discount_percent"
  | "material_adjustment_percent";

export type LineBreakdownRow = {
  key: string;
  label: string;
  amount: number;
};

export type QuoteItemComputed = {
  areaPerUnit: number;
  totalArea: number;
  baseComponent: number;
  materialComponent: number;
  optionsComponent: number;
  laborComponent: number;
  volumeDiscount: number;
  materialAdjustment: number;
  subtotalBeforeMinimum: number;
  minimumFloorApplied: number;
  lineTotal: number;
  currency: string;
  rows: LineBreakdownRow[];
};
