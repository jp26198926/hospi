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

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  departmentId: string | null;
}

interface SelectedPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

interface AppointmentFormProps {
  patientId?: string;
}

export function AppointmentForm({ patientId }: AppointmentFormProps) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(
    patientId ? { id: patientId, mrn: "", firstName: "", lastName: "" } : null
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [deptRes, svcRes, staffRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/services"),
          fetch("/api/staff"),
        ]);
        const deptJson = await deptRes.json();
        const svcJson = await svcRes.json();
        const staffJson = await staffRes.json();

        if (deptJson.success) setDepartments(deptJson.data ?? []);
        if (svcJson.success) setServices(svcJson.data ?? []);
        if (staffJson.success) setStaff(staffJson.data ?? []);
      } catch {
        // ignore
      }
    }
    load();
  }, []);

  const filteredServices = departmentId
    ? services.filter((s) => s.departmentId === departmentId)
    : services;
  const filteredStaff = departmentId
    ? staff.filter((s) => s.departmentId === departmentId)
    : staff;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const effectivePatientId = selectedPatient?.id || patientId;
    if (!effectivePatientId) {
      setError("Please select a patient");
      return;
    }
    if (!departmentId) {
      setError("Please select a department");
      return;
    }
    if (!date || !startTime || !endTime) {
      setError("Please fill in date, start time, and end time");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patientId: effectivePatientId,
        departmentId,
        serviceId: serviceId || null,
        staffId: staffId || null,
        date,
        startTime,
        endTime,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to create appointment");
        return;
      }

      router.push("/appointments");
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
          <CardTitle className="text-base">Patient</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPatient && selectedPatient.firstName ? (
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Department *" htmlFor="departmentId">
            <Select
              id="departmentId"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setServiceId("");
                setStaffId("");
              }}
              required
            >
              <option value="">Select department</option>
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
          <FormField label="Staff / Provider" htmlFor="staffId">
            <Select
              id="staffId"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">Select staff (optional)</option>
              {filteredStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date *" htmlFor="date">
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Start Time *" htmlFor="startTime">
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </FormField>
          <FormField label="End Time *" htmlFor="endTime">
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Reason" htmlFor="reason">
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Reason for appointment"
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          Book Appointment
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
