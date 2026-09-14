import { notFound } from "next/navigation";
import { getPatientById } from "@/modules/patients/service";
import { PatientForm } from "@/components/patients/patient-form";

export const dynamic = "force-dynamic";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient;
  try {
    patient = await getPatientById(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Patient</h2>
        <p className="text-muted-foreground">
          Update the record for {patient.firstName} {patient.lastName} ({patient.mrn}).
        </p>
      </div>
      <PatientForm mode="edit" initialData={patient} patientId={id} />
    </div>
  );
}
