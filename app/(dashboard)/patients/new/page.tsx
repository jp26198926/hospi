import { PatientForm } from "@/components/patients/patient-form";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Register Patient</h2>
        <p className="text-muted-foreground">Create a new patient record.</p>
      </div>
      <PatientForm mode="create" />
    </div>
  );
}
