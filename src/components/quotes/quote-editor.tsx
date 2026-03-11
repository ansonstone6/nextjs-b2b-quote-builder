"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { QuoteItemComputed } from "@/lib/pricing/types";
import type { SerializedQuote } from "@/lib/quotes/serialize";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { QuickBooksSyncPanel } from "@/modules/quickbooks/components/quickbooks-sync-panel";

type Catalog = {
  products: {
    id: string;
    name: string;
    dimensionUnitLabel: string;
    areaUnitLabel: string;
    options: { id: string; name: string; modifierType: string; modifierValue: string }[];
  }[];
  materials: { id: string; name: string }[];
};

function money(currency: string, amount: string) {
  return `${currency} ${amount}`;
}

export function QuoteEditor({ initial }: { initial: SerializedQuote }) {
  const [quote, setQuote] = useState(initial);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editable = quote.status === "draft" || quote.status === "sent";

  const loadCatalog = useCallback(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setError("Could not load catalog"));
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setQuote(initial);
  }, [initial]);

  async function patchQuote(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      setQuote(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function addLine(payload: {
    productId: string;
    materialId: string;
    width: number;
    height: number;
    quantity: number;
    optionIds: string[];
  }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Add line failed");
        return;
      }
      setQuote(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function patchLine(
    itemId: string,
    body: {
      productId?: string;
      materialId?: string;
      width?: number;
      height?: number;
      quantity?: number;
      label?: string | null;
      optionIds?: string[];
    },
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update line failed");
        return;
      }
      setQuote(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLine(itemId: string) {
    if (!confirm("Remove this line?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/items/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Delete failed");
        return;
      }
      setQuote(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Approve failed");
        return;
      }
      setQuote(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function convertOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert-order`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Convert failed");
        return;
      }
      setQuote(data);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const defaultProductId = catalog?.products[0]?.id ?? "";
  const defaultMaterialId = catalog?.materials[0]?.id ?? "";

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{quote.quoteNumber}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {quote.client.companyName} · {quote.client.contactName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{quote.status}</Badge>
            {quote.order ? (
              <Badge variant="outline">
                Order {quote.order.id.slice(0, 8)}… ({quote.order.status})
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">Total</div>
          <div className="text-lg font-semibold">{money(quote.currency, quote.grandTotal)}</div>
          <div className="text-muted-foreground">
            Subtotal {money(quote.currency, quote.subtotal)} · Tax {money(quote.currency, quote.taxAmount)}
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Header</CardTitle>
          <CardDescription>Notes and tax apply to the whole quote. Pricing still comes from server rules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="tax">
                Tax rate (%)
              </label>
              <HeaderTaxInput
                key={quote.updatedAt}
                id="tax"
                disabled={!editable || busy}
                defaultValue={quote.taxRatePercent}
                onSave={(v) => patchQuote({ taxRatePercent: v })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="notes">
              Notes
            </label>
            <HeaderNotesInput
              key={`notes-${quote.updatedAt}`}
              id="notes"
              disabled={!editable || busy}
              defaultValue={quote.notes ?? ""}
              onSave={(v) => patchQuote({ notes: v })}
            />
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={!editable || busy} onClick={() => patchQuote({ status: "draft" })}>
            Save as draft
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>Dimensions use each product&apos;s unit labels. Totals refresh from the server after each change.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quote.items.map((item) => (
            <LineCard
              key={item.id}
              item={item}
              catalog={catalog}
              editable={editable}
              busy={busy}
              currency={quote.currency}
              onUpdate={(body) => patchLine(item.id, body)}
              onDelete={() => deleteLine(item.id)}
            />
          ))}

          {editable && catalog ? (
            <AddLineForm
              catalog={catalog}
              defaultProductId={defaultProductId}
              defaultMaterialId={defaultMaterialId}
              busy={busy}
              onAdd={addLine}
            />
          ) : null}
        </CardContent>
      </Card>

      <QuickBooksSyncPanel quoteId={quote.id} quoteStatus={quote.status} />

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/quotes/${quote.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Download PDF
        </a>
        {(quote.status === "draft" || quote.status === "sent") && (
          <Button type="button" onClick={approve} disabled={busy}>
            Mark approved
          </Button>
        )}
        {quote.status === "approved" && !quote.order && (
          <Button type="button" onClick={convertOrder} disabled={busy}>
            Create order from quote
          </Button>
        )}
        <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
          Back to list
        </Link>
      </div>
    </main>
  );
}

function HeaderTaxInput({
  id,
  defaultValue,
  disabled,
  onSave,
}: {
  id: string;
  defaultValue: string;
  disabled: boolean;
  onSave: (v: number) => void;
}) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="number"
        step="0.01"
        min="0"
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onSave(Number.parseFloat(v) || 0)}>
        Apply
      </Button>
    </div>
  );
}

function HeaderNotesInput({
  id,
  defaultValue,
  disabled,
  onSave,
}: {
  id: string;
  defaultValue: string;
  disabled: boolean;
  onSave: (v: string | null) => void;
}) {
  const [v, setV] = useState(defaultValue);
  return (
    <div className="space-y-2">
      <Textarea id={id} value={v} disabled={disabled} onChange={(e) => setV(e.target.value)} rows={3} />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onSave(v || null)}>
        Apply notes
      </Button>
    </div>
  );
}

type LinePatch = {
  productId?: string;
  materialId?: string;
  width?: number;
  height?: number;
  quantity?: number;
  label?: string | null;
  optionIds?: string[];
};

function LineCard({
  item,
  catalog,
  editable,
  busy,
  currency,
  onUpdate,
  onDelete,
}: {
  item: SerializedQuote["items"][number];
  catalog: Catalog | null;
  editable: boolean;
  busy: boolean;
  currency: string;
  onUpdate: (body: LinePatch) => void;
  onDelete: () => void;
}) {
  const [productId, setProductId] = useState(item.productId);
  const [materialId, setMaterialId] = useState(item.materialId);
  const [width, setWidth] = useState(item.width);
  const [height, setHeight] = useState(item.height);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [label, setLabel] = useState(item.label ?? "");
  const [optionIds, setOptionIds] = useState<string[]>(item.optionIds);

  const productOptions = useMemo(() => {
    if (!catalog) return [];
    return catalog.products.find((p) => p.id === productId)?.options ?? [];
  }, [catalog, productId]);

  useEffect(() => {
    setProductId(item.productId);
    setMaterialId(item.materialId);
    setWidth(item.width);
    setHeight(item.height);
    setQuantity(String(item.quantity));
    setLabel(item.label ?? "");
    setOptionIds(item.optionIds);
  }, [item]);

  function toggleOption(id: string) {
    setOptionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function apply() {
    onUpdate({
      productId,
      materialId,
      width: Number.parseFloat(width) || 0,
      height: Number.parseFloat(height) || 0,
      quantity: Math.max(1, Math.round(Number.parseFloat(quantity) || 1)),
      label: label || null,
      optionIds,
    });
  }

  const computed = item.computed as QuoteItemComputed | null;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{item.product.name}</span>
        <span className="text-sm font-semibold">{money(currency, item.lineTotal)}</span>
      </div>
      {editable && catalog ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Product</label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setOptionIds([]);
              }}
            >
              {catalog.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Material</label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              {catalog.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Width (
              {catalog?.products.find((p) => p.id === productId)?.dimensionUnitLabel ?? item.product.dimensionUnitLabel})
            </label>
            <Input value={width} onChange={(e) => setWidth(e.target.value)} type="number" step="0.0001" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Height (
              {catalog?.products.find((p) => p.id === productId)?.dimensionUnitLabel ?? item.product.dimensionUnitLabel})
            </label>
            <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" step="0.0001" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Quantity</label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={1} step={1} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Label (optional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>
      ) : null}

      {editable && productOptions.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Options</span>
          <div className="flex flex-wrap gap-3">
            {productOptions.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={optionIds.includes(o.id)} onChange={() => toggleOption(o.id)} />
                {o.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={apply} disabled={busy}>
            Update line & recalculate
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={onDelete} disabled={busy}>
            Remove
          </Button>
        </div>
      ) : null}

      {computed ? (
        <>
          <Separator />
          <div className="text-sm space-y-1">
            <div className="text-muted-foreground text-xs">
              Area per unit {computed.areaPerUnit} {item.product.areaUnitLabel} · total area {computed.totalArea}{" "}
              {item.product.areaUnitLabel}
            </div>
            <ul className="mt-2 space-y-1">
              {computed.rows.map((r) => (
                <li key={r.key} className="flex justify-between gap-4">
                  <span>{r.label}</span>
                  <span>
                    {r.amount < 0 ? "−" : ""}
                    {money(currency, String(Math.abs(r.amount)))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">No breakdown yet. Update the line to calculate.</p>
      )}
    </div>
  );
}

function AddLineForm({
  catalog,
  defaultProductId,
  defaultMaterialId,
  busy,
  onAdd,
}: {
  catalog: Catalog;
  defaultProductId: string;
  defaultMaterialId: string;
  busy: boolean;
  onAdd: (p: {
    productId: string;
    materialId: string;
    width: number;
    height: number;
    quantity: number;
    optionIds: string[];
  }) => void;
}) {
  const [productId, setProductId] = useState(defaultProductId);
  const [materialId, setMaterialId] = useState(defaultMaterialId);
  const [width, setWidth] = useState("1");
  const [height, setHeight] = useState("1");
  const [quantity, setQuantity] = useState("1");
  const [optionIds, setOptionIds] = useState<string[]>([]);

  const productOptions = useMemo(() => catalog.products.find((p) => p.id === productId)?.options ?? [], [catalog, productId]);

  function toggleOption(id: string) {
    setOptionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-3">
      <div className="font-medium text-sm">Add line</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Product</label>
          <select
            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setOptionIds([]);
            }}
          >
            {catalog.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Material</label>
          <select
            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
          >
            {catalog.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Width</label>
          <Input value={width} onChange={(e) => setWidth(e.target.value)} type="number" step="0.0001" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Height</label>
          <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" step="0.0001" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Quantity</label>
          <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min={1} step={1} />
        </div>
      </div>
      {productOptions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {productOptions.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={optionIds.includes(o.id)} onChange={() => toggleOption(o.id)} />
              {o.name}
            </label>
          ))}
        </div>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={busy || !productId || !materialId}
        onClick={() =>
          onAdd({
            productId,
            materialId,
            width: Number.parseFloat(width) || 1,
            height: Number.parseFloat(height) || 1,
            quantity: Math.max(1, Math.round(Number.parseFloat(quantity) || 1)),
            optionIds,
          })
        }
      >
        Add line
      </Button>
    </div>
  );
}
