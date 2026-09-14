import Link from "next/link";
import { listMedications } from "@/modules/pharmacy/catalog-service";
import {
  listBatches,
  listStockMovements,
  listReorderAlerts,
} from "@/modules/pharmacy/inventory-service";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { MedicationTable } from "@/components/inventory/medication-table";
import { ReceiveBatchButton } from "@/components/inventory/receive-batch-button";

const movementVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  IN: "success",
  OUT: "info",
  RETURN: "warning",
  ADJUSTMENT: "warning",
  TRANSFER: "default",
  EXPIRED: "destructive",
};

export default async function PharmacyInventoryPage() {
  const [medsResult, batchesResult, movementsResult, reorderAlerts] = await Promise.all([
    listMedications({ active: true, page: 1, limit: 200 }),
    listBatches({ page: 1, limit: 1000 }),
    listStockMovements({ page: 1, limit: 50 }),
    listReorderAlerts(),
  ]);

  // Aggregate on-hand qty per medication from batches
  const stockMap = new Map<string, number>();
  for (const batch of batchesResult.items) {
    stockMap.set(
      batch.medicationId,
      (stockMap.get(batch.medicationId) ?? 0) + batch.quantity
    );
  }

  const medicationStock = medsResult.items.map((m) => ({
    id: m.id,
    genericName: m.genericName,
    brandName: m.brandName,
    dosageForm: m.dosageForm,
    strength: m.strength,
    unit: m.unit,
    reorderLevel: m.reorderLevel,
    sellingPrice: m.sellingPrice,
    totalOnHand: stockMap.get(m.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">
            {medsResult.total} medication{medsResult.total !== 1 ? "s" : ""} ·{" "}
            {reorderAlerts.length} reorder alert{reorderAlerts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pharmacy"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
          >
            Back to Pharmacy
          </Link>
          <ReceiveBatchButton
            medications={medsResult.items.map((m) => ({
              id: m.id,
              genericName: m.genericName,
              strength: m.strength,
              dosageForm: m.dosageForm,
            }))}
          />
        </div>
      </div>

      {/* Reorder Alerts */}
      {reorderAlerts.length > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            <span className="font-medium">
              {reorderAlerts.length} medication{reorderAlerts.length !== 1 ? "s" : ""}{" "}
              at or below reorder level:
            </span>{" "}
            {reorderAlerts.map((a) => a.genericName).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Medication Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medication Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <MedicationTable items={medicationStock} />
        </CardContent>
      </Card>

      {/* Reorder Alerts Detail */}
      {reorderAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reorder Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reorderAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{alert.genericName}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.strength} {alert.dosageForm}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span>
                      On hand:{" "}
                      <span className="font-mono font-medium">{alert.totalOnHand}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Reorder at: {alert.reorderLevel}
                    </span>
                    <Badge variant="destructive">
                      Short by {alert.shortfall}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {movementsResult.items.length === 0 ? (
            <EmptyState
              title="No stock movements"
              description="Receive a batch or dispense to start tracking movements."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>After</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementsResult.items.map((mv) => (
                      <TableRow key={mv.id}>
                        <TableCell>
                          <Badge variant={movementVariant[mv.type] ?? "default"}>
                            {mv.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{mv.genericName ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {mv.batchNumber ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono">
                          {mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {mv.quantityAfter}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {mv.notes ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(mv.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2 md:hidden">
                {movementsResult.items.map((mv) => (
                  <div key={mv.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{mv.genericName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          Batch: {mv.batchNumber ?? "—"}
                        </p>
                      </div>
                      <Badge variant={movementVariant[mv.type] ?? "default"}>
                        {mv.type}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span>
                        Qty:{" "}
                        <span className="font-mono">
                          {mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity}
                        </span>{" "}
                        → {mv.quantityAfter}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(mv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {mv.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{mv.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
