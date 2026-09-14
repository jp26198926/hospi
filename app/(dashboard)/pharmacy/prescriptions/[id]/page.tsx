import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrescriptionDetail } from "@/modules/pharmacy/service";

export const dynamic = "force-dynamic";
import { DispenseForm } from "@/components/pharmacy/dispense-form";

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let prescription;
  try {
    prescription = await getPrescriptionDetail(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prescription</h2>
          <p className="font-mono text-sm text-muted-foreground">
            {prescription.orderNumber ?? prescription.id}
          </p>
        </div>
        <Link
          href="/pharmacy"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Pharmacy
        </Link>
      </div>

      <DispenseForm prescriptionId={id} />
    </div>
  );
}
