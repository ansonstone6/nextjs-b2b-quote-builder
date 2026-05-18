import type { Client, Material, Product, ProductOption, Quote, QuoteItem } from "@prisma/client";
import type { QuoteItemComputed } from "@/lib/pricing/types";
import { mouldingImageFor } from "@/lib/catalog/moulding-image";

export type SerializedQuoteItem = {
  id: string;
  quoteId: string;
  productId: string;
  materialId: string;
  label: string | null;
  width: string;
  height: string;
  quantity: number;
  optionIds: string[];
  selectedOptionNames: string[];
  computed: QuoteItemComputed | null;
  lineTotal: string;
  sortOrder: number;
  product: Pick<Product, "id" | "name" | "dimensionUnitLabel" | "areaUnitLabel">;
  material: Pick<Material, "id" | "name"> & {
    imageUrl: string | null;
    pricePerFoot: string | null;
    supplier: string | null;
    profileWidthInches: string | null;
    inStock: boolean;
  };
};

export type SerializedQuote = {
  id: string;
  clientId: string;
  quoteNumber: string;
  status: Quote["status"];
  currency: string;
  taxRatePercent: string;
  notes: string | null;
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  createdAt: string;
  updatedAt: string;
  client: Pick<Client, "id" | "companyName" | "contactName" | "email">;
  items: SerializedQuoteItem[];
  order: { id: string; status: string } | null;
};

export function serializeQuoteItem(
  item: QuoteItem & {
    product: Product & { options?: ProductOption[] };
    material: Material;
  },
): SerializedQuoteItem {
  const raw = item.optionIds;
  const optionIds = Array.isArray(raw) ? (raw as string[]) : [];
  const productOptions = item.product.options ?? [];
  const selectedOptionNames = productOptions
    .filter((o) => optionIds.includes(o.id))
    .map((o) => o.name);
  return {
    id: item.id,
    quoteId: item.quoteId,
    productId: item.productId,
    materialId: item.materialId,
    label: item.label,
    width: item.width.toString(),
    height: item.height.toString(),
    quantity: item.quantity,
    optionIds,
    selectedOptionNames,
    computed: (item.computed as QuoteItemComputed | null) ?? null,
    lineTotal: item.lineTotal.toString(),
    sortOrder: item.sortOrder,
    product: {
      id: item.product.id,
      name: item.product.name,
      dimensionUnitLabel: item.product.dimensionUnitLabel,
      areaUnitLabel: item.product.areaUnitLabel,
    },
    material: {
      id: item.material.id,
      name: item.material.name,
      imageUrl: mouldingImageFor(item.material.name),
      pricePerFoot: item.material.pricePerFoot?.toString() ?? null,
      supplier: item.material.supplier,
      profileWidthInches: item.material.profileWidthInches?.toString() ?? null,
      inStock: item.material.inStock,
    },
  };
}

export function serializeQuote(
  quote: Quote & {
    client: Client;
    items: (QuoteItem & {
      product: Product & { options?: ProductOption[] };
      material: Material;
    })[];
    order: { id: string; status: string } | null;
  },
): SerializedQuote {
  return {
    id: quote.id,
    clientId: quote.clientId,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    currency: quote.currency,
    taxRatePercent: quote.taxRatePercent.toString(),
    notes: quote.notes,
    subtotal: quote.subtotal.toString(),
    taxAmount: quote.taxAmount.toString(),
    grandTotal: quote.grandTotal.toString(),
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    client: {
      id: quote.client.id,
      companyName: quote.client.companyName,
      contactName: quote.client.contactName,
      email: quote.client.email,
    },
    items: quote.items.map(serializeQuoteItem),
    order: quote.order ?? null,
  };
}
