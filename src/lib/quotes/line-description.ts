type OptionRef = { id: string; name: string };

type ItemForDescription = {
  product: { name: string; dimensionUnitLabel: string };
  material: { name: string };
  width: string | number;
  height: string | number;
  quantity: number;
  optionIds: string[];
  label?: string | null;
};

function formatDim(v: string | number): string {
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Builds a framing-style line description from a quote item and the option catalog.
 * Example: `Custom Frame · Walnut 2" Profile · 32×40 in · qty 6 · Museum glass · 8-ply rag mat`
 *
 * The product/material/option names already carry the domain language (set in seed/admin),
 * so this is just a presentation join - no framing-specific logic lives here.
 */
export function frameLineDescription(
  item: ItemForDescription,
  allOptions: OptionRef[] = [],
): string {
  const selected = allOptions.filter((o) => item.optionIds.includes(o.id));
  const dims = `${formatDim(item.width)}×${formatDim(item.height)} ${item.product.dimensionUnitLabel}`;
  const parts = [
    item.product.name,
    item.material.name,
    dims,
    `qty ${item.quantity}`,
    ...selected.map((o) => o.name),
  ];
  return parts.join(" · ");
}
