"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LabTest {
  id: string;
  code: string;
  name: string;
  unit: string | null;
}

interface LabPanel {
  id: string;
  code: string;
  name: string;
  tests: Array<{ testId: string; testCode: string; testName: string }>;
}

interface RadProcedure {
  id: string;
  code: string;
  name: string;
  modalityName: string | null;
}

interface Medication {
  id: string;
  genericName: string;
  brandName: string | null;
  dosageForm: string;
  strength: string;
  sellingPrice: number;
}

interface MedicationRow {
  medicationId: string;
  dose: string;
  route: string;
  frequency: string;
  durationDays: string;
  quantity: string;
  instructions: string;
}

interface OrderFormProps {
  encounterId?: string;
  patientId?: string;
  consultationId?: string;
}

const emptyMedRow = (): MedicationRow => ({
  medicationId: "",
  dose: "",
  route: "",
  frequency: "",
  durationDays: "",
  quantity: "1",
  instructions: "",
});

export function OrderForm({ encounterId, patientId, consultationId }: OrderFormProps) {
  const router = useRouter();
  const [type, setType] = useState("laboratory");
  const [priority, setPriority] = useState("normal");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Patient / encounter (required by API)
  const [patientIdState, setPatientIdState] = useState(patientId ?? "");
  const [encounterIdState, setEncounterIdState] = useState(encounterId ?? "");

  // Laboratory
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labPanels, setLabPanels] = useState<LabPanel[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [labNotes, setLabNotes] = useState("");

  // Radiology
  const [procedures, setProcedures] = useState<RadProcedure[]>([]);
  const [procedureId, setProcedureId] = useState("");
  const [clinicalQuestion, setClinicalQuestion] = useState("");

  // Medication
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medRows, setMedRows] = useState<MedicationRow[]>([emptyMedRow()]);
  const [medNotes, setMedNotes] = useState("");

  // Fetch catalogs
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [testsRes, panelsRes, procsRes, medsRes] = await Promise.all([
          fetch("/api/laboratory/tests?active=true&limit=200"),
          fetch("/api/laboratory/panels"),
          fetch("/api/radiology/procedures?active=true&limit=200"),
          fetch("/api/pharmacy/medications?active=true&limit=200"),
        ]);
        const [testsJson, panelsJson, procsJson, medsJson] = await Promise.all([
          testsRes.json(),
          panelsRes.json(),
          procsRes.json(),
          medsRes.json(),
        ]);
        if (cancelled) return;
        if (testsJson.success) setLabTests(testsJson.data.items ?? []);
        if (panelsJson.success) setLabPanels(panelsJson.data ?? []);
        if (procsJson.success) setProcedures(procsJson.data.items ?? []);
        if (medsJson.success) setMedications(medsJson.data.items ?? []);
      } catch {
        // catalogs will remain empty
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleTest(testId: string) {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  }

  function addMedRow() {
    setMedRows((prev) => [...prev, emptyMedRow()]);
  }

  function removeMedRow(index: number) {
    setMedRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updateMedRow(index: number, key: keyof MedicationRow, value: string) {
    setMedRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!patientIdState || !encounterIdState) {
      setError("Patient ID and Encounter ID are required.");
      return;
    }

    if (type === "laboratory" && selectedTestIds.length === 0 && !selectedPanelId) {
      setError("Select at least one test or a panel.");
      return;
    }
    if (type === "radiology" && !procedureId) {
      setError("Select a procedure.");
      return;
    }
    if (type === "medication") {
      const valid = medRows.filter((r) => r.medicationId && r.dose && r.route && r.frequency);
      if (valid.length === 0) {
        setError("Add at least one medication item with dose, route, and frequency.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type,
        patientId: patientIdState,
        encounterId: encounterIdState,
        consultationId: consultationId || null,
        priority,
        clinicalNotes: clinicalNotes || null,
      };

      if (type === "laboratory") {
        payload.lab = {
          panelId: selectedPanelId || null,
          testIds: selectedTestIds,
          notes: labNotes || null,
        };
      } else if (type === "radiology") {
        payload.radiology = {
          procedureId,
          clinicalQuestion: clinicalQuestion || null,
        };
      } else if (type === "medication") {
        payload.medication = {
          items: medRows
            .filter((r) => r.medicationId && r.dose && r.route && r.frequency)
            .map((r) => ({
              medicationId: r.medicationId,
              dose: r.dose,
              route: r.route,
              frequency: r.frequency,
              durationDays: r.durationDays ? Number(r.durationDays) : null,
              quantity: Number(r.quantity) || 1,
              instructions: r.instructions || null,
            })),
          notes: medNotes || null,
        };
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to create order");
        return;
      }

      router.push("/orders");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {!patientId && (
            <FormField label="Patient ID *" htmlFor="patientId">
              <Input
                id="patientId"
                value={patientIdState}
                onChange={(e) => setPatientIdState(e.target.value)}
                required
                placeholder="Patient UUID"
              />
            </FormField>
          )}
          {!encounterId && (
            <FormField label="Encounter ID *" htmlFor="encounterId">
              <Input
                id="encounterId"
                value={encounterIdState}
                onChange={(e) => setEncounterIdState(e.target.value)}
                required
                placeholder="Encounter UUID"
              />
            </FormField>
          )}
          <FormField label="Order Type *" htmlFor="type">
            <Select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="laboratory">Laboratory</option>
              <option value="radiology">Radiology</option>
              <option value="medication">Medication</option>
            </Select>
          </FormField>
          <FormField label="Priority" htmlFor="priority">
            <Select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Clinical Notes" htmlFor="clinicalNotes">
              <Textarea
                id="clinicalNotes"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Indication, relevant history…"
                rows={3}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {type === "laboratory" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laboratory Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Panel (optional)" htmlFor="panelId">
              <Select
                id="panelId"
                value={selectedPanelId}
                onChange={(e) => setSelectedPanelId(e.target.value)}
              >
                <option value="">No panel</option>
                {labPanels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <div>
              <p className="mb-2 text-sm font-medium">Tests</p>
              {labTests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tests available.</p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-3">
                  {labTests.map((t) => (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTestIds.includes(t.id)}
                        onChange={() => toggleTest(t.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                      <span>{t.name}</span>
                      {t.unit && (
                        <span className="text-xs text-muted-foreground">({t.unit})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              {selectedTestIds.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedTestIds.length} test{selectedTestIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <FormField label="Lab Notes" htmlFor="labNotes">
              <Textarea
                id="labNotes"
                value={labNotes}
                onChange={(e) => setLabNotes(e.target.value)}
                rows={2}
              />
            </FormField>
          </CardContent>
        </Card>
      )}

      {type === "radiology" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Radiology Procedure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Procedure *" htmlFor="procedureId">
              <Select
                id="procedureId"
                value={procedureId}
                onChange={(e) => setProcedureId(e.target.value)}
                required
              >
                <option value="">Select procedure</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                    {p.modalityName ? ` (${p.modalityName})` : ""}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Clinical Question" htmlFor="clinicalQuestion">
              <Textarea
                id="clinicalQuestion"
                value={clinicalQuestion}
                onChange={(e) => setClinicalQuestion(e.target.value)}
                placeholder="What question should the study answer?"
                rows={3}
              />
            </FormField>
          </CardContent>
        </Card>
      )}

      {type === "medication" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Medications</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={addMedRow}>
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {medRows.map((row, index) => (
              <div
                key={index}
                className="space-y-3 rounded-md border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Item {index + 1}</span>
                  {medRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedRow(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <FormField label="Medication *" htmlFor={`med-${index}`}>
                  <Select
                    id={`med-${index}`}
                    value={row.medicationId}
                    onChange={(e) => updateMedRow(index, "medicationId", e.target.value)}
                    required
                  >
                    <option value="">Select medication</option>
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.genericName}
                        {m.strength ? ` ${m.strength}` : ""}
                        {m.dosageForm ? ` (${m.dosageForm})` : ""}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <FormField label="Dose *" htmlFor={`dose-${index}`}>
                    <Input
                      id={`dose-${index}`}
                      value={row.dose}
                      onChange={(e) => updateMedRow(index, "dose", e.target.value)}
                      required
                      placeholder="500mg"
                    />
                  </FormField>
                  <FormField label="Route *" htmlFor={`route-${index}`}>
                    <Select
                      id={`route-${index}`}
                      value={row.route}
                      onChange={(e) => updateMedRow(index, "route", e.target.value)}
                      required
                    >
                      <option value="">Select</option>
                      <option value="oral">Oral</option>
                      <option value="iv">IV</option>
                      <option value="im">IM</option>
                      <option value="sc">SC</option>
                      <option value="topical">Topical</option>
                      <option value="inhalation">Inhalation</option>
                      <option value="rectal">Rectal</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormField>
                  <FormField label="Frequency *" htmlFor={`freq-${index}`}>
                    <Select
                      id={`freq-${index}`}
                      value={row.frequency}
                      onChange={(e) => updateMedRow(index, "frequency", e.target.value)}
                      required
                    >
                      <option value="">Select</option>
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="bid">BID</option>
                      <option value="tid">TID</option>
                      <option value="qid">QID</option>
                      <option value="q4h">Q4H</option>
                      <option value="q6h">Q6H</option>
                      <option value="q8h">Q8H</option>
                      <option value="q12h">Q12H</option>
                      <option value="prn">PRN</option>
                    </Select>
                  </FormField>
                  <FormField label="Qty *" htmlFor={`qty-${index}`}>
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateMedRow(index, "quantity", e.target.value)}
                      required
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Duration (days)" htmlFor={`dur-${index}`}>
                    <Input
                      id={`dur-${index}`}
                      type="number"
                      min={1}
                      value={row.durationDays}
                      onChange={(e) => updateMedRow(index, "durationDays", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Instructions" htmlFor={`instr-${index}`}>
                    <Input
                      id={`instr-${index}`}
                      value={row.instructions}
                      onChange={(e) => updateMedRow(index, "instructions", e.target.value)}
                      placeholder="Take after meals"
                    />
                  </FormField>
                </div>
              </div>
            ))}
            <FormField label="Prescription Notes" htmlFor="medNotes">
              <Textarea
                id="medNotes"
                value={medNotes}
                onChange={(e) => setMedNotes(e.target.value)}
                rows={2}
              />
            </FormField>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          Create Order
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
