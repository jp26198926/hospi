"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PatientSearch } from "@/components/patients/patient-search";

interface Department {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  departmentId: string | null;
}

interface SelectedPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

interface WalkInFormProps {
  departments: Department[];
  services: Service[];
}

export function WalkInForm({ departments, services }: WalkInFormProps) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [encounterType, setEncounterType] = useState("outpatient");
  const [departmentId, setDepartmentId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredServices = departmentId
    ? services.filter((s) => s.departmentId === departmentId)
    : services;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedPatient) {
      setError("Please select a patient");
      return;
    }

    setLoading(true);
    try {
      // Create encounter
      const encRes = await fetch("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          type: encounterType,
          departmentId: departmentId || null,
          notes: reason.trim() || null,
        }),
      });
      const encJson = await encRes.json();

      if (!encJson.success) {
        setError(encJson.error?.message || "Failed to create encounter");
        return;
      }

      const encounterId = encJson.data.id;

      // Create queue entry
      const queueRes = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueType: "reception",
          patientId: selectedPatient.id,
          encounterId,
          departmentId: departmentId || null,
          serviceId: serviceId || null,
          priority,
          notes: reason.trim() || null,
        }),
      });
      const queueJson = await queueRes.json();

      if (!queueJson.success) {
        setError(queueJson.error?.message || "Encounter created but failed to add to queue");
        return;
      }

      setSuccess(
        `Walk-in registered for ${selectedPatient.firstName} ${selectedPatient.lastName}. Queue #${queueJson.data.queueNumber}`
      );
      setSelectedPatient(null);
      setReason("");
      setEncounterType("outpatient");
      setDepartmentId("");
      setServiceId("");
      setPriority("normal");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Walk-in Registration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <FormField label="Patient *" htmlFor="walkin-patient">
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.mrn}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <PatientSearch
                onSelect={(p) =>
                  setSelectedPatient({
                    id: p.id,
                    mrn: p.mrn,
                    firstName: p.firstName,
                    lastName: p.lastName,
                  })
                }
              />
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Encounter Type *" htmlFor="encounterType">
              <Select
                id="encounterType"
                value={encounterType}
                onChange={(e) => setEncounterType(e.target.value)}
                required
              >
                <option value="outpatient">Outpatient</option>
                <option value="emergency">Emergency</option>
                <option value="laboratory_only">Laboratory Only</option>
                <option value="radiology_only">Radiology Only</option>
                <option value="pharmacy_walk_in">Pharmacy Walk-in</option>
                <option value="consultation">Consultation</option>
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
            <FormField label="Department" htmlFor="departmentId">
              <Select
                id="departmentId"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setServiceId("");
                }}
              >
                <option value="">Select department (optional)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Service" htmlFor="serviceId">
              <Select
                id="serviceId"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Select service (optional)</option>
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Reason" htmlFor="reason">
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Reason for visit"
            />
          </FormField>

          <Button type="submit" loading={loading} className="w-full">
            Register Walk-in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
