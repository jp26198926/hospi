import Link from "next/link";
import { notFound } from "next/navigation";
import { getLabOrderDetail } from "@/modules/laboratory/service";

export const dynamic = "force-dynamic";
import { LabOrderWorkspace } from "@/components/laboratory/lab-order-workspace";

export default async function LabOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order;
  try {
    order = await getLabOrderDetail(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lab Order</h2>
          <p className="font-mono text-sm text-muted-foreground">{order.orderNumber}</p>
        </div>
        <Link
          href="/laboratory"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Worklist
        </Link>
      </div>

      <LabOrderWorkspace orderId={id} />
    </div>
  );
}
