"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Medication {
  id: string;
  genericName: string;
  strength: string;
  dosageForm: string;
}

interface ReceiveBatchDialogProps {
  open: boolean;
  onClose: () => void;
  medications: Medication[];
}

export function ReceiveBatchDialog({ open, onClose, medications }: ReceiveBatchDialogProps) {
  const router = useRouter();
  const [medicationId, setMedicationId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form resets handled by parent remount via key when needed

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/pharmacy/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId,
          batchNumber,
          expirationDate,
          quantity: Number(quantity),
          notes: notes || null,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to receive batch");
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Receive Batch">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField label="Medication *" htmlFor="batchMedicationId">
          <Select
            id="batchMedicationId"
            value={medicationId}
            onChange={(e) => setMedicationId(e.target.value)}
            required
          >
            <option value="">Select medication</option>
            {medications.map((m) => (
              <option key={m.id} value={m.id}>
                {m.genericName} {m.strength} ({m.dosageForm})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Batch Number *" htmlFor="batchNumber">
          <Input
            id="batchNumber"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            required
            maxLength={100}
          />
        </FormField>

        <FormField label="Expiration Date *" htmlFor="expirationDate">
          <Input
            id="expirationDate"
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Quantity *" htmlFor="batchQuantity">
          <Input
            id="batchQuantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Notes" htmlFor="batchNotes">
          <Textarea
            id="batchNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </FormField>

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>
            Receive Batch
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
