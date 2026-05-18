export type PricingRuleType =
  | "base_per_area"
  | "base_per_perimeter"
  | "minimum_line"
  | "volume_discount_percent"
  | "material_adjustment_percent";

export type LineBreakdownRow = {
  key: string;
  label: string;
  amount: number;
  /// Optional human-readable formula (e.g. "9.5 ft × $24/ft"). Shown in the
  /// configurator and PDF so the client can see the math, not just the total.
  detail?: string;
};

export type QuoteItemComputed = {
  areaPerUnit: number;
  totalArea: number;
  /// Perimeter per unit, in inches. Frame products use this to bill moulding by linear ft.
  perimeterPerUnitInches: number;
  /// Total perimeter (perimeter_per_unit × quantity), in inches.
  totalPerimeterInches: number;
  baseComponent: number;
  /// Moulding charge from perimeter rules. Separate from baseComponent so the
  /// breakdown can label it explicitly.
  mouldingComponent: number;
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
