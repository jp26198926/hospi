import Link from "next/link";
import { listOrders } from "@/modules/orders/service";

export const dynamic = "force-dynamic";
import { OrderList } from "@/components/orders/order-list";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) || 1 : 1;

  const result = await listOrders({ type, status, page, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            {result.total} order{result.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Order
        </Link>
      </div>

      <OrderList initialOrders={result.items} />
    </div>
  );
}
