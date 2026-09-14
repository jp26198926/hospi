import Link from "next/link";
import {
  listTests,
  listPanels,
  listSpecimenTypes,
} from "@/modules/laboratory/catalog-service";

export const dynamic = "force-dynamic";
import { LabCatalogClient } from "@/components/laboratory/lab-catalog-client";

export default async function LabCatalogPage() {
  const [testsResult, panels, specimenTypes] = await Promise.all([
    listTests({ page: 1, limit: 200 }),
    listPanels(),
    listSpecimenTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lab Catalog</h2>
          <p className="text-muted-foreground">
            Manage tests, panels, and specimen types.
          </p>
        </div>
        <Link
          href="/laboratory"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Worklist
        </Link>
      </div>

      <LabCatalogClient
        initialTests={testsResult.items}
        initialPanels={panels}
        initialSpecimenTypes={specimenTypes}
      />
    </div>
  );
}
