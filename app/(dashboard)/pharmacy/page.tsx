import Link from "next/link";
import { listPrescriptions } from "@/modules/pharmacy/service";

export const dynamic = "force-dynamic";
import { StatusBadge } from "@/components/ui/status-badge";
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

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "dispensed", label: "Dispensed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "", label: "All" },
];

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "pending";
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) || 1 : 1;

  const result = await listPrescriptions({
    status: status || undefined,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pharmacy</h2>
          <p className="text-muted-foreground">
            {result.total} prescription{result.total !== 1 ? "s" : ""}
            {status ? ` (${status})` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pharmacy/walk-in"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
          >
            Walk-in Sale
          </Link>
          <Link
            href="/pharmacy/inventory"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
          >
            Inventory
          </Link>
          <Link
            href="/pharmacy/catalog"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
          >
            Catalog
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/pharmacy?status=${tab.value}` : "/pharmacy"}
            className={`inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
              status === tab.value
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
          title="No prescriptions"
          description={
            status === "pending"
              ? "No pending prescriptions to dispense."
              : "No prescriptions match this filter."
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
                  <TableHead>Status</TableHead>
                  <TableHead>Prescribed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-mono text-xs">
                      {rx.orderNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {rx.patientFirstName} {rx.patientLastName}
                      </p>
                      {rx.patientMrn && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {rx.patientMrn}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rx.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(rx.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/pharmacy/prescriptions/${rx.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {rx.status === "pending" ? "Dispense" : "View"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {result.items.map((rx) => (
              <Card key={rx.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm">{rx.orderNumber ?? "—"}</p>
                      <p className="font-medium">
                        {rx.patientFirstName} {rx.patientLastName}
                      </p>
                      {rx.patientMrn && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {rx.patientMrn}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={rx.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/pharmacy/prescriptions/${rx.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {rx.status === "pending" ? "Dispense" : "View"}
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
