import Link from "next/link";
import { listMedications } from "@/modules/pharmacy/catalog-service";

export const dynamic = "force-dynamic";
import { PharmacyCatalogClient } from "@/components/pharmacy/pharmacy-catalog-client";

export default async function PharmacyCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search : undefined;

  const result = await listMedications({ search, page: 1, limit: 200 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Medication Catalog</h2>
          <p className="text-muted-foreground">
            {result.total} medication{result.total !== 1 ? "s" : ""} in catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pharmacy/inventory"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
          >
            Inventory
          </Link>
          <Link
            href="/pharmacy"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
          >
            Back to Pharmacy
          </Link>
        </div>
      </div>

      <PharmacyCatalogClient initialMedications={result.items} />
    </div>
  );
}
