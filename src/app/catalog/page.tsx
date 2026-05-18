import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { mouldingImageFor } from "@/lib/catalog/moulding-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AreaOption = { id: string; name: string; ratePerSqFt: number };
type FixedOption = { id: string; name: string; amount: number };

export default async function CatalogPage() {
  const [materials, products] = await Promise.all([
    prisma.material.findMany({ orderBy: [{ inStock: "desc" }, { pricePerFoot: "asc" }] }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { options: { orderBy: { name: "asc" } } },
    }),
  ]);

  // Group options across all products into glass / mat / mount / other categories.
  // Names are convention-driven (set in seed); catalog presentation reads them
  // back into structured sections so an editor can review the catalog as a whole.
  const allOptions = products.flatMap((p) => p.options);
  const dedupedByName = new Map<string, (typeof allOptions)[number]>();
  for (const o of allOptions) {
    if (!dedupedByName.has(o.name)) dedupedByName.set(o.name, o);
  }
  const unique = [...dedupedByName.values()];

  const glassOptions: AreaOption[] = unique
    .filter((o) => o.modifierType === "area" && /glass|acrylic|optium/i.test(o.name))
    .map((o) => ({ id: o.id, name: o.name, ratePerSqFt: Number(o.modifierValue) }))
    .sort((a, b) => a.ratePerSqFt - b.ratePerSqFt);

  const matOptions: AreaOption[] = unique
    .filter((o) => o.modifierType === "area" && /mat/i.test(o.name))
    .map((o) => ({ id: o.id, name: o.name, ratePerSqFt: Number(o.modifierValue) }))
    .sort((a, b) => a.ratePerSqFt - b.ratePerSqFt);

  const mountOptions: FixedOption[] = unique
    .filter(
      (o) =>
        o.modifierType === "fixed" &&
        /(mount|cleat|hinge|hanging|lining)/i.test(o.name),
    )
    .map((o) => ({ id: o.id, name: o.name, amount: Number(o.modifierValue) }))
    .sort((a, b) => a.amount - b.amount);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Moulding library, glass tiers, mat options, and mounting methods. Pricing rules and labor
            schedules live in the database and drive every quote - nothing is hardcoded in the UI.
          </p>
        </div>
        <Link href="/quotes/new" className={cn(buttonVariants())}>
          New quote
        </Link>
      </div>

      {/* Mouldings */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Mouldings</h2>
          <span className="text-muted-foreground text-xs">
            {materials.length} profiles · billed per linear foot of perimeter
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => {
            const img = mouldingImageFor(m.name);
            return (
              <Card key={m.id} className="overflow-hidden">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={m.name}
                    className="h-32 w-full border-b object-cover"
                  />
                ) : (
                  <div className="h-32 w-full border-b bg-muted" />
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{m.name}</CardTitle>
                    {m.inStock ? (
                      <Badge variant="secondary">In stock</Badge>
                    ) : (
                      <Badge variant="outline">Backorder</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {m.supplier ?? "-"}
                    {m.profileWidthInches
                      ? ` · ${m.profileWidthInches.toString()}" face`
                      : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-semibold">
                    ${m.pricePerFoot?.toString() ?? "-"}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      / linear ft
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Glass */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Glass &amp; glazing</h2>
          <span className="text-muted-foreground text-xs">Billed per sq ft of artwork area</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {glassOptions.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm leading-tight">{g.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-semibold">
                  ${g.ratePerSqFt}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">/ sq ft</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Mats */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Mats</h2>
          <span className="text-muted-foreground text-xs">Billed per sq ft (yield/waste built in)</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matOptions.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm leading-tight">{m.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-semibold">
                  ${m.ratePerSqFt}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">/ sq ft</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Mounting & hardware */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Mounting &amp; hardware</h2>
          <span className="text-muted-foreground text-xs">Flat fee per piece</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mountOptions.map((mo) => (
            <Card key={mo.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm leading-tight">{mo.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-semibold">
                  ${mo.amount}
                  <span className="text-muted-foreground ml-1 text-xs font-normal">/ piece</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

    </main>
  );
}
