import Link from "next/link";
import { notFound } from "next/navigation";
import { getRadiologyOrderDetail } from "@/modules/radiology/service";

export const dynamic = "force-dynamic";
import { RadOrderWorkspace } from "@/components/radiology/rad-order-workspace";

export default async function RadOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order;
  try {
    order = await getRadiologyOrderDetail(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Radiology Order</h2>
          <p className="font-mono text-sm text-muted-foreground">{order.orderNumber}</p>
        </div>
        <Link
          href="/radiology"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Worklist
        </Link>
      </div>

      <RadOrderWorkspace orderId={id} />
    </div>
  );
}
