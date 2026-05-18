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

type CatalogMaterial = {
  id: string;
  name: string;
  imageUrl: string | null;
  pricePerFoot: string | null;
  supplier: string | null;
  profileWidthInches: string | null;
  inStock: boolean;
};

type CatalogOption = {
  id: string;
  name: string;
  modifierType: string;
  modifierValue: string;
};

type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  dimensionUnitLabel: string;
  areaUnitLabel: string;
  options: CatalogOption[];
};

type Catalog = {
  products: CatalogProduct[];
  materials: CatalogMaterial[];
};

function money(currency: string, amount: string | number) {
  const n = typeof amount === "number" ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function classifyOption(o: CatalogOption): "glass" | "mat" | "mount" | "other" {
  if (o.modifierType === "area" && /glass|acrylic|optium/i.test(o.name)) return "glass";
  if (o.modifierType === "area" && /mat/i.test(o.name)) return "mat";
  if (o.modifierType === "fixed" && /(mount|cleat|hinge|hanging|lining)/i.test(o.name)) return "mount";
  return "other";
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
    if (!confirm("Remove this quote line?")) return;
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

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{quote.quoteNumber}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {quote.client.companyName} · {quote.client.contactName} · {quote.client.email}
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
          <div className="text-muted-foreground text-xs uppercase tracking-wide">Total</div>
          <div className="text-2xl font-semibold">{money(quote.currency, quote.grandTotal)}</div>
          <div className="text-muted-foreground text-xs">
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
          <CardTitle>Quote header</CardTitle>
          <CardDescription>Tax rate and notes apply to the whole quote.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr] items-start">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="tax">
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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="notes">
                Notes (shown on PDF)
              </label>
              <HeaderNotesInput
                key={`notes-${quote.updatedAt}`}
                id="notes"
                disabled={!editable || busy}
                defaultValue={quote.notes ?? ""}
                onSave={(v) => patchQuote({ notes: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Quote lines</h2>
          <span className="text-muted-foreground text-xs">
            {quote.items.length} {quote.items.length === 1 ? "line" : "lines"} · prices computed
            server-side after each change
          </span>
        </div>
        {quote.items.map((item) => (
          <LineConfigurator
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
          <AddLineForm catalog={catalog} busy={busy} onAdd={addLine} />
        ) : null}
      </section>

      <QuickBooksSyncPanel quoteId={quote.id} quoteStatus={quote.status} />

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/quotes/${quote.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Generate PDF
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
          Back to quotes
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onSave(Number.parseFloat(v) || 0)}
      >
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
      <Textarea id={id} value={v} disabled={disabled} onChange={(e) => setV(e.target.value)} rows={2} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onSave(v || null)}
      >
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

function LineConfigurator({
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

  const glassOpts = productOptions.filter((o) => classifyOption(o) === "glass");
  const matOpts = productOptions.filter((o) => classifyOption(o) === "mat");
  const mountOpts = productOptions.filter((o) => classifyOption(o) === "mount");
  const otherOpts = productOptions.filter((o) => classifyOption(o) === "other");

  // Glass and mat are exclusive (pick one of each). Mount and others are multi-select.
  const selectedGlass = glassOpts.find((o) => optionIds.includes(o.id));
  const selectedMat = matOpts.find((o) => optionIds.includes(o.id));

  function pickGlass(id: string | null) {
    setOptionIds((prev) => {
      const without = prev.filter((x) => !glassOpts.some((g) => g.id === x));
      return id ? [...without, id] : without;
    });
  }
  function pickMat(id: string | null) {
    setOptionIds((prev) => {
      const without = prev.filter((x) => !matOpts.some((m) => m.id === x));
      return id ? [...without, id] : without;
    });
  }
  function toggleOption(id: string) {
    setOptionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
  const widthN = Number.parseFloat(item.width);
  const heightN = Number.parseFloat(item.height);
  const perimeterFt = Number.isFinite(widthN + heightN) ? (2 * (widthN + heightN)) / 12 : 0;
  const areaSqFt = Number.isFinite(widthN * heightN) ? (widthN * heightN) / 144 : 0;

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_320px]">
        {/* Left: inputs */}
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">
                {item.label?.trim() || item.product.name}
              </div>
              <div className="text-muted-foreground text-xs">
                {item.material.name}
                {item.material.profileWidthInches
                  ? ` · ${item.material.profileWidthInches}" face`
                  : ""}
                {item.material.supplier ? ` · ${item.material.supplier}` : ""}
              </div>
            </div>
            {item.material.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.material.imageUrl}
                alt={item.material.name}
                className="h-14 w-20 shrink-0 rounded border object-cover"
              />
            ) : null}
          </div>

          {editable && catalog ? (
            <>
              <FieldGrid>
                <Field label="Product">
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
                </Field>
                <Field label="Line label (shown on PDF)">
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. FW26 Lookbook" />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field label="Artwork width (in)">
                  <Input
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    type="number"
                    step="0.25"
                  />
                </Field>
                <Field label="Artwork height (in)">
                  <Input
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    type="number"
                    step="0.25"
                  />
                </Field>
                <Field label="Quantity">
                  <Input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    type="number"
                    min={1}
                    step={1}
                  />
                </Field>
              </FieldGrid>

              <Field label="Moulding profile">
                <select
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                >
                  {catalog.materials.map((m) => (
                    <option key={m.id} value={m.id} disabled={!m.inStock}>
                      {m.name}
                      {m.pricePerFoot ? ` - $${m.pricePerFoot}/ft` : ""}
                      {!m.inStock ? " (backorder)" : ""}
                    </option>
                  ))}
                </select>
                <MaterialPreview material={catalog.materials.find((m) => m.id === materialId)} />
              </Field>

              {glassOpts.length > 0 ? (
                <Field label="Glass / glazing">
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                    value={selectedGlass?.id ?? ""}
                    onChange={(e) => pickGlass(e.target.value || null)}
                  >
                    <option value="">- none -</option>
                    {glassOpts.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (${g.modifierValue}/sq ft)
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {matOpts.length > 0 ? (
                <Field label="Mat">
                  <select
                    className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                    value={selectedMat?.id ?? ""}
                    onChange={(e) => pickMat(e.target.value || null)}
                  >
                    <option value="">- no mat -</option>
                    {matOpts.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (${m.modifierValue}/sq ft)
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {mountOpts.length > 0 ? (
                <Field label="Mounting & hardware">
                  <div className="flex flex-wrap gap-3">
                    {mountOpts.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={optionIds.includes(o.id)}
                          onChange={() => toggleOption(o.id)}
                        />
                        {o.name} <span className="text-muted-foreground text-xs">${o.modifierValue}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              ) : null}

              {otherOpts.length > 0 ? (
                <Field label="Other">
                  <div className="flex flex-wrap gap-3">
                    {otherOpts.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={optionIds.includes(o.id)}
                          onChange={() => toggleOption(o.id)}
                        />
                        {o.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          {o.modifierType === "percent"
                            ? `+${o.modifierValue}%`
                            : `$${o.modifierValue}`}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" size="sm" onClick={apply} disabled={busy}>
                  Update line &amp; recalculate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={busy}
                >
                  Remove line
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Size: </span>
                {item.width}×{item.height} in · qty {item.quantity}
              </div>
              <div>
                <span className="text-muted-foreground">Options: </span>
                {item.selectedOptionNames.length > 0
                  ? item.selectedOptionNames.join(", ")
                  : "(none)"}
              </div>
            </div>
          )}
        </div>

        {/* Right: sticky breakdown */}
        <aside className="border-t lg:border-t-0 lg:border-l bg-muted/30 p-6 space-y-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Line breakdown</div>
          <div className="text-2xl font-semibold">{money(currency, item.lineTotal)}</div>
          <div className="text-xs text-muted-foreground">
            Perimeter {perimeterFt.toFixed(2)} ft · Area {areaSqFt.toFixed(2)} sq ft · qty{" "}
            {item.quantity}
          </div>
          <Separator />
          {computed?.rows.length ? (
            <ul className="space-y-2 text-sm">
              {computed.rows.map((r) => (
                <li key={r.key}>
                  <div className="flex justify-between gap-3">
                    <span>{r.label}</span>
                    <span>
                      {r.amount < 0 ? "−" : ""}
                      {money(currency, Math.abs(r.amount))}
                    </span>
                  </div>
                  {r.detail ? (
                    <div className="text-muted-foreground text-xs">{r.detail}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Save the line to compute pricing.
            </p>
          )}
        </aside>
      </div>
    </Card>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function MaterialPreview({ material }: { material: CatalogMaterial | undefined }) {
  if (!material) return null;
  return (
    <div className="mt-2 flex items-center gap-3 rounded border bg-card p-2">
      {material.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={material.imageUrl}
          alt={material.name}
          className="h-10 w-16 shrink-0 rounded border object-cover"
        />
      ) : (
        <div className="h-10 w-16 shrink-0 rounded border bg-muted" />
      )}
      <div className="text-xs space-y-0.5">
        <div className="font-medium">{material.name}</div>
        <div className="text-muted-foreground">
          {material.supplier ?? "-"}
          {material.profileWidthInches ? ` · ${material.profileWidthInches}" face` : ""}
          {material.pricePerFoot ? ` · $${material.pricePerFoot}/ft` : ""}
        </div>
      </div>
    </div>
  );
}

function AddLineForm({
  catalog,
  busy,
  onAdd,
}: {
  catalog: Catalog;
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
  const [productId, setProductId] = useState(catalog.products[0]?.id ?? "");
  const [materialId, setMaterialId] = useState(catalog.materials[0]?.id ?? "");
  const [width, setWidth] = useState("24");
  const [height, setHeight] = useState("36");
  const [quantity, setQuantity] = useState("1");

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Add another line</CardTitle>
        <CardDescription>
          Adds a new framing line to this quote (e.g. for a different size or moulding).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGrid>
          <Field label="Product">
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {catalog.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Moulding">
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              {catalog.materials.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.inStock}>
                  {m.name}
                  {m.pricePerFoot ? ` - $${m.pricePerFoot}/ft` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Width (in)">
            <Input type="number" step="0.25" value={width} onChange={(e) => setWidth(e.target.value)} />
          </Field>
          <Field label="Height (in)">
            <Input type="number" step="0.25" value={height} onChange={(e) => setHeight(e.target.value)} />
          </Field>
        </FieldGrid>
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
              optionIds: [],
            })
          }
        >
          Add line
        </Button>
      </CardContent>
    </Card>
  );
}
