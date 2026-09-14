import Link from "next/link";
import { WalkInSaleForm } from "@/components/pharmacy/walk-in-sale-form";

export default function WalkInSalePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Walk-in Sale</h2>
          <p className="text-muted-foreground">
            Sell medications directly to walk-in customers.
          </p>
        </div>
        <Link
          href="/pharmacy"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Pharmacy
        </Link>
      </div>

      <WalkInSaleForm />
    </div>
  );
}
