import { prisma } from "@/lib/prisma";
import { AdminCatalog } from "@/components/admin/admin-catalog";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [materials, products] = await Promise.all([
    prisma.material.findMany({ orderBy: [{ inStock: "desc" }, { name: "asc" }] }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { options: { orderBy: { name: "asc" } } },
    }),
  ]);

  const initialMaterials = materials.map((m) => ({
    id: m.id,
    name: m.name,
    pricePerFoot: m.pricePerFoot?.toString() ?? null,
    supplier: m.supplier,
    profileWidthInches: m.profileWidthInches?.toString() ?? null,
    inStock: m.inStock,
  }));

  const initialProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    options: p.options.map((o) => ({
      id: o.id,
      name: o.name,
      modifierType: o.modifierType as "fixed" | "percent" | "area",
      modifierValue: o.modifierValue.toString(),
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Catalog admin</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Edit the moulding library and the glass / mat / mounting options for each product.
          Changes apply immediately to new quote lines and to recalculation of editable
          (draft / sent) quotes. Approved quotes keep their snapshotted prices.
        </p>
      </div>
      <AdminCatalog initialMaterials={initialMaterials} initialProducts={initialProducts} />
    </main>
  );
}
