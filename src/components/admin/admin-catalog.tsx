"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Material = {
  id: string;
  name: string;
  pricePerFoot: string | null;
  supplier: string | null;
  profileWidthInches: string | null;
  inStock: boolean;
};

type Option = {
  id: string;
  name: string;
  modifierType: "fixed" | "percent" | "area";
  modifierValue: string;
};

type Product = {
  id: string;
  name: string;
  options: Option[];
};

const MODIFIER_TYPES: Option["modifierType"][] = ["fixed", "percent", "area"];

function modifierUnit(t: Option["modifierType"]): string {
  if (t === "percent") return "% of subtotal";
  if (t === "area") return "$ / sq ft";
  return "$ flat";
}

export function AdminCatalog({
  initialMaterials,
  initialProducts,
}: {
  initialMaterials: Material[];
  initialProducts: Product[];
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState<string | null>(null);

  // --- Materials -----------------------------------------------------------
  async function saveMaterial(m: Material) {
    setError(null);
    const res = await fetch(`/api/admin/materials/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setMaterials((prev) => prev.map((x) => (x.id === m.id ? data : x)));
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Delete this moulding? This cannot be undone.")) return;
    setError(null);
    const res = await fetch(`/api/admin/materials/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Delete failed");
      return;
    }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  async function addMaterial(draft: Material) {
    setError(null);
    const res = await fetch(`/api/admin/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Create failed");
      return null;
    }
    setMaterials((prev) =>
      [...prev, data].sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.name.localeCompare(b.name)),
    );
    return data;
  }

  // --- Options -------------------------------------------------------------
  async function saveOption(productId: string, o: Option) {
    setError(null);
    const res = await fetch(`/api/admin/options/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(o),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, options: p.options.map((x) => (x.id === o.id ? data : x)) }
          : p,
      ),
    );
  }

  async function deleteOption(productId: string, id: string) {
    if (!confirm("Delete this option? This cannot be undone.")) return;
    setError(null);
    const res = await fetch(`/api/admin/options/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Delete failed");
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, options: p.options.filter((o) => o.id !== id) } : p,
      ),
    );
  }

  async function addOption(productId: string, draft: Omit<Option, "id">) {
    setError(null);
    const res = await fetch(`/api/admin/products/${productId}/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Create failed");
      return null;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, options: [...p.options, data].sort((a, b) => a.name.localeCompare(b.name)) }
          : p,
      ),
    );
    return data;
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Mouldings</h2>
          <span className="text-muted-foreground text-xs">
            {materials.length} profiles · billed per linear foot
          </span>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Supplier</th>
                  <th className="px-3 py-2 text-right font-medium">Profile (in)</th>
                  <th className="px-3 py-2 text-right font-medium">$ / ft</th>
                  <th className="px-3 py-2 text-center font-medium">Stock</th>
                  <th className="px-3 py-2 text-right font-medium w-0" />
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <MaterialRow
                    key={m.id}
                    material={m}
                    onSave={saveMaterial}
                    onDelete={() => deleteMaterial(m.id)}
                  />
                ))}
                <NewMaterialRow onAdd={addMaterial} />
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {products.map((p) => (
        <section key={p.id} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{p.name} - options</h2>
            <span className="text-muted-foreground text-xs">
              {p.options.length} options · glass &amp; mat use <code>area</code>, mount uses{" "}
              <code>fixed</code>, rush uses <code>percent</code>
            </span>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Value</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium w-0" />
                  </tr>
                </thead>
                <tbody>
                  {p.options.map((o) => (
                    <OptionRow
                      key={o.id}
                      option={o}
                      onSave={(opt) => saveOption(p.id, opt)}
                      onDelete={() => deleteOption(p.id, o.id)}
                    />
                  ))}
                  <NewOptionRow onAdd={(opt) => addOption(p.id, opt)} />
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      ))}

      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-base">Heads up</CardTitle>
          <CardDescription>
            This admin is unauthenticated for the public demo. Don&apos;t paste real prices or
            sensitive supplier data - anyone with the link can see and edit it.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function MaterialRow({
  material,
  onSave,
  onDelete,
}: {
  material: Material;
  onSave: (m: Material) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(material);
  const dirty =
    draft.name !== material.name ||
    draft.supplier !== material.supplier ||
    draft.pricePerFoot !== material.pricePerFoot ||
    draft.profileWidthInches !== material.profileWidthInches ||
    draft.inStock !== material.inStock;
  const [busy, setBusy] = useState(false);
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2">
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          value={draft.supplier ?? ""}
          onChange={(e) => setDraft({ ...draft, supplier: e.target.value || null })}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.25"
          className="text-right"
          value={draft.profileWidthInches ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, profileWidthInches: e.target.value || null })
          }
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.01"
          className="text-right"
          value={draft.pricePerFoot ?? ""}
          onChange={(e) => setDraft({ ...draft, pricePerFoot: e.target.value || null })}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.inStock}
            onChange={(e) => setDraft({ ...draft, inStock: e.target.checked })}
          />
          {draft.inStock ? (
            <Badge variant="secondary" className="text-xs">
              In stock
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Backorder
            </Badge>
          )}
        </label>
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!dirty || busy}
            onClick={async () => {
              setBusy(true);
              await onSave(draft);
              setBusy(false);
            }}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDelete();
              setBusy(false);
            }}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

function NewMaterialRow({ onAdd }: { onAdd: (m: Material) => Promise<Material | null> }) {
  const blank: Material = {
    id: "",
    name: "",
    supplier: "",
    profileWidthInches: "",
    pricePerFoot: "",
    inStock: true,
  };
  const [draft, setDraft] = useState<Material>(blank);
  const [busy, setBusy] = useState(false);
  const canAdd = draft.name.trim().length > 0;
  return (
    <tr className="border-t bg-muted/20">
      <td className="px-3 py-2">
        <Input
          placeholder="e.g. Cherry 1.5&quot; Profile"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          placeholder="Supplier"
          value={draft.supplier ?? ""}
          onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.25"
          className="text-right"
          placeholder="1.5"
          value={draft.profileWidthInches ?? ""}
          onChange={(e) => setDraft({ ...draft, profileWidthInches: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.01"
          className="text-right"
          placeholder="18.00"
          value={draft.pricePerFoot ?? ""}
          onChange={(e) => setDraft({ ...draft, pricePerFoot: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={draft.inStock}
          onChange={(e) => setDraft({ ...draft, inStock: e.target.checked })}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!canAdd || busy}
            onClick={async () => {
              setBusy(true);
              const created = await onAdd(draft);
              setBusy(false);
              if (created) setDraft(blank);
            }}
          >
            Add moulding
          </Button>
        </div>
      </td>
    </tr>
  );
}

function OptionRow({
  option,
  onSave,
  onDelete,
}: {
  option: Option;
  onSave: (o: Option) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(option);
  const [busy, setBusy] = useState(false);
  const dirty =
    draft.name !== option.name ||
    draft.modifierType !== option.modifierType ||
    draft.modifierValue !== option.modifierValue;
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2">
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
          value={draft.modifierType}
          onChange={(e) =>
            setDraft({ ...draft, modifierType: e.target.value as Option["modifierType"] })
          }
        >
          {MODIFIER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.01"
          className="text-right"
          value={draft.modifierValue}
          onChange={(e) => setDraft({ ...draft, modifierValue: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {modifierUnit(draft.modifierType)}
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!dirty || busy}
            onClick={async () => {
              setBusy(true);
              await onSave(draft);
              setBusy(false);
            }}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDelete();
              setBusy(false);
            }}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

function NewOptionRow({
  onAdd,
}: {
  onAdd: (o: Omit<Option, "id">) => Promise<Option | null>;
}) {
  const blank = {
    name: "",
    modifierType: "fixed" as Option["modifierType"],
    modifierValue: "",
  };
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const canAdd = draft.name.trim().length > 0 && draft.modifierValue !== "";
  return (
    <tr className="border-t bg-muted/20">
      <td className="px-3 py-2">
        <Input
          placeholder="e.g. Conservation Clear glass"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
          value={draft.modifierType}
          onChange={(e) =>
            setDraft({ ...draft, modifierType: e.target.value as Option["modifierType"] })
          }
        >
          {MODIFIER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          step="0.01"
          className="text-right"
          placeholder="14"
          value={draft.modifierValue}
          onChange={(e) => setDraft({ ...draft, modifierValue: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {modifierUnit(draft.modifierType)}
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!canAdd || busy}
            onClick={async () => {
              setBusy(true);
              const created = await onAdd(draft);
              setBusy(false);
              if (created) setDraft(blank);
            }}
          >
            Add option
          </Button>
        </div>
      </td>
    </tr>
  );
}
