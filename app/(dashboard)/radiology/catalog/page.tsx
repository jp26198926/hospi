import Link from "next/link";
import {
  listModalities,
  listProcedures,
} from "@/modules/radiology/catalog-service";

export const dynamic = "force-dynamic";
import { RadCatalogClient } from "@/components/radiology/rad-catalog-client";

export default async function RadCatalogPage() {
  const [modalities, proceduresResult] = await Promise.all([
    listModalities(),
    listProcedures({ page: 1, limit: 200 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Radiology Catalog</h2>
          <p className="text-muted-foreground">
            Manage imaging modalities and procedures.
          </p>
        </div>
        <Link
          href="/radiology"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Worklist
        </Link>
      </div>

      <RadCatalogClient
        initialModalities={modalities}
        initialProcedures={proceduresResult.items}
      />
    </div>
  );
}
