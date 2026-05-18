const MOULDING_IMAGES: Record<string, string> = {
  "Walnut 2\" Profile": "/mouldings/walnut-2.svg",
  "Black Maple 1.5\" Profile": "/mouldings/black-maple-1-5.svg",
  "Gilded Ornate 3\" Profile": "/mouldings/gilded-ornate-3.svg",
};

export function mouldingImageFor(materialName: string): string | null {
  return MOULDING_IMAGES[materialName] ?? null;
}
