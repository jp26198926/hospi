"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface PrescriptionItem {
  id: string;
  medicationId: string;
  dose: string;
  route: string;
  frequency: string;
  durationDays: number | null;
  quantity: number;
  instructions: string | null;
  genericName: string;
  brandName: string | null;
  dosageForm: string;
  strength: string;
  unit: string | null;
  sellingPrice: number;
}

interface PrescriptionDetail {
  id: string;
  orderId: string | null;
  patientId: string;
  encounterId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  orderNumber: string | null;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
  items: PrescriptionItem[];
}

interface BatchPreview {
  batchNumber: string;
  expirationDate: string;
  quantity: number;
}

interface DispenseFormProps {
  prescriptionId: string;
}

export function DispenseForm({ prescriptionId }: DispenseFormProps) {
  const router = useRouter();
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [batchPreviews, setBatchPreviews] = useState<Record<string, BatchPreview[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dispensing, setDispensing] = useState(false);
  const [notes, setNotes] = useState("");

  const fetchPrescription = useCallback(async () => {
    try {
      const res = await fetch(`/api/pharmacy/prescriptions/${prescriptionId}`);
      const json = await res.json();
      if (json.success) {
        setPrescription(json.data);
        setError(null);

        // Fetch FEFO batch preview for each medication
        const previews: Record<string, BatchPreview[]> = {};
        await Promise.all(
          (json.data.items ?? []).map(async (item: PrescriptionItem) => {
            try {
              const batchRes = await fetch(
                `/api/pharmacy/batches?medicationId=${item.medicationId}&limit=10`
              );
              const batchJson = await batchRes.json();
              if (batchJson.success) {
                previews[item.medicationId] = (batchJson.data.items ?? []).map(
                  (b: { batchNumber: string; expirationDate: string; quantity: number }) => ({
                    batchNumber: b.batchNumber,
                    expirationDate: b.expirationDate,
                    quantity: b.quantity,
                  })
                );
              }
            } catch {
              // skip
            }
          })
        );
        setBatchPreviews(previews);
      } else {
        setError(json.error?.message || "Failed to load prescription");
      }
    } catch {
      setError("Failed to load prescription");
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/pharmacy/prescriptions/${prescriptionId}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setPrescription(json.data);
          setError(null);
          const previews: Record<string, BatchPreview[]> = {};
          await Promise.all(
            (json.data.items ?? []).map(async (item: PrescriptionItem) => {
              try {
                const batchRes = await fetch(
                  `/api/pharmacy/batches?medicationId=${item.medicationId}&limit=10`
                );
                const batchJson = await batchRes.json();
                if (batchJson.success) {
                  previews[item.medicationId] = (batchJson.data.items ?? []).map(
                    (b: { batchNumber: string; expirationDate: string; quantity: number }) => ({
                      batchNumber: b.batchNumber,
                      expirationDate: b.expirationDate,
                      quantity: b.quantity,
                    })
                  );
                }
              } catch {
                // skip
              }
            })
          );
          if (!cancelled) setBatchPreviews(previews);
        } else {
          setError(json.error?.message || "Failed to load prescription");
        }
      } catch {
        if (!cancelled) setError("Failed to load prescription");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [prescriptionId]);

  async function handleDispense() {
    setActionError(null);
    setDispensing(true);
    try {
      const res = await fetch("/api/pharmacy/dispensings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionError(json.error?.message || "Failed to dispense");
        return;
      }
      await fetchPrescription();
      router.refresh();
    } catch {
      setActionError("Failed to dispense");
    } finally {
      setDispensing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading prescription…</p>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <Alert variant="error">
        <AlertDescription>{error ?? "Prescription not found"}</AlertDescription>
      </Alert>
    );
  }

  const patientName = `${prescription.patientFirstName ?? ""} ${prescription.patientLastName ?? ""}`.trim();
  const isPending = prescription.status === "pending";
  const totalEstimate = prescription.items.reduce(
    (sum, item) => sum + item.quantity * item.sellingPrice,
    0
  );

  return (
    <div className="space-y-6">
      {actionError && (
        <Alert variant="error">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Prescription Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">{patientName}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono">{prescription.patientMrn}</span>
                {prescription.orderNumber && (
                  <>
                    {" · "}
                    <span className="font-mono">{prescription.orderNumber}</span>
                  </>
                )}
              </p>
            </div>
            <StatusBadge status={prescription.status} />
          </div>
        </CardHeader>
        <CardContent>
          {prescription.notes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              {prescription.notes}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Prescribed {new Date(prescription.createdAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Items with FEFO batch preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dose / Route</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>FEFO Batches</TableHead>
                  <TableHead>Est. Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescription.items.map((item) => {
                  const batches = batchPreviews[item.medicationId] ?? [];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.genericName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.strength} {item.dosageForm}
                          {item.brandName ? ` · ${item.brandName}` : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        {item.dose} · {item.route}
                      </TableCell>
                      <TableCell>{item.frequency}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {batches.length === 0 ? (
                          <Badge variant="destructive">No stock</Badge>
                        ) : (
                          <div className="space-y-1">
                            {batches.slice(0, 3).map((b, i) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                {b.batchNumber} · exp{" "}
                                {new Date(b.expirationDate).toLocaleDateString()} · qty{" "}
                                {b.quantity}
                              </p>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        ${(item.quantity * item.sellingPrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {prescription.items.map((item) => {
              const batches = batchPreviews[item.medicationId] ?? [];
              return (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="font-medium">{item.genericName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.strength} {item.dosageForm}
                  </p>
                  <p className="mt-1 text-sm">
                    {item.dose} · {item.route} · {item.frequency} · qty {item.quantity}
                  </p>
                  <div className="mt-2">
                    {batches.length === 0 ? (
                      <Badge variant="destructive">No stock</Badge>
                    ) : (
                      <div className="space-y-1">
                        {batches.slice(0, 3).map((b, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {b.batchNumber} · exp{" "}
                            {new Date(b.expirationDate).toLocaleDateString()} · qty{" "}
                            {b.quantity}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    ${(item.quantity * item.sellingPrice).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium">Estimated Total</span>
            <span className="text-lg font-bold">${totalEstimate.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Dispense Action */}
      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Dispensing Notes" htmlFor="dispenseNotes">
              <Textarea
                id="dispenseNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes…"
                rows={2}
              />
            </FormField>
            <p className="text-xs text-muted-foreground">
              Batches will be picked automatically using FEFO (First-Expired, First-Out).
            </p>
            <Button onClick={handleDispense} loading={dispensing}>
              Confirm Dispense
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
