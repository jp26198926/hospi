import Link from "next/link";
import { listRadiologyOrders } from "@/modules/radiology/service";

export const dynamic = "force-dynamic";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const priorityVariant: Record<string, "default" | "warning" | "destructive"> = {
  normal: "default",
  urgent: "warning",
  emergency: "destructive",
};

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ordered", label: "Ordered" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function RadiologyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) || 1 : 1;

  const result = await listRadiologyOrders({ status, page, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Radiology</h2>
          <p className="text-muted-foreground">
            {result.total} radiology order{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/radiology/catalog"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
          >
            Catalog
          </Link>
          <Link
            href="/orders/new?type=radiology"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New Radiology Order
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/radiology?status=${tab.value}` : "/radiology"}
            className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
              (status ?? "") === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="No radiology orders"
          description={
            status
              ? "Try a different status filter."
              : "Create a radiology order to get started."
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Study Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {order.patientFirstName} {order.patientLastName}
                      </p>
                      {order.patientMrn && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {order.patientMrn}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p>{order.procedureName ?? "—"}</p>
                      {order.modalityName && (
                        <p className="text-xs text-muted-foreground">
                          {order.modalityName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.studyStatus ? (
                        <StatusBadge status={order.studyStatus} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[order.priority] ?? "default"}>
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/radiology/orders/${order.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {result.items.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm">{order.orderNumber}</p>
                      <p className="font-medium">
                        {order.patientFirstName} {order.patientLastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.procedureName ?? "—"}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2">
                    <div className="flex gap-2">
                      <Badge variant={priorityVariant[order.priority] ?? "default"}>
                        {order.priority}
                      </Badge>
                      {order.studyStatus && (
                        <StatusBadge status={order.studyStatus} />
                      )}
                    </div>
                    <Link
                      href={`/radiology/orders/${order.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
