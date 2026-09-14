import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

interface MedicationStockRow {
  id: string;
  genericName: string;
  brandName: string | null;
  dosageForm: string;
  strength: string;
  unit: string | null;
  reorderLevel: number;
  sellingPrice: number;
  totalOnHand: number;
}

interface MedicationTableProps {
  items: MedicationStockRow[];
}

export function MedicationTable({ items }: MedicationTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No medications"
        description="Add medications in the catalog to track stock."
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medication</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>On Hand</TableHead>
              <TableHead>Reorder Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((med) => {
              const lowStock = med.totalOnHand <= med.reorderLevel;
              return (
                <TableRow key={med.id}>
                  <TableCell>
                    <p className="font-medium">{med.genericName}</p>
                    {med.brandName && (
                      <p className="text-xs text-muted-foreground">{med.brandName}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {med.strength} {med.dosageForm}
                  </TableCell>
                  <TableCell className="font-mono">{med.totalOnHand}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {med.reorderLevel}
                  </TableCell>
                  <TableCell>
                    {lowStock ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge variant="success">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell>${med.sellingPrice.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {items.map((med) => {
          const lowStock = med.totalOnHand <= med.reorderLevel;
          return (
            <div key={med.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{med.genericName}</p>
                  {med.brandName && (
                    <p className="text-xs text-muted-foreground">{med.brandName}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {med.strength} {med.dosageForm}
                  </p>
                </div>
                {lowStock ? (
                  <Badge variant="destructive">Low Stock</Badge>
                ) : (
                  <Badge variant="success">In Stock</Badge>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                <span>
                  On hand: <span className="font-mono font-medium">{med.totalOnHand}</span>
                </span>
                <span className="text-muted-foreground">
                  Reorder at: {med.reorderLevel}
                </span>
                <span className="font-medium">${med.sellingPrice.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
