import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getEncounterById } from "@/modules/encounters/service";
import { listTriageRecords } from "@/modules/triage/service";
import { listConsultationsByEncounter, getConsultationById } from "@/modules/consultation/service";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { ConsultationForm } from "@/components/consultation/consultation-form";

export default async function ConsultationEncounterPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = await params;
  const session = await requireSession();

  let encounter;
  try {
    encounter = await getEncounterById(encounterId);
  } catch {
    notFound();
  }

  const triageRecords = await listTriageRecords(encounterId);
  const consultations = await listConsultationsByEncounter(encounterId);

  // Use the latest consultation (draft preferred, else the most recent)
  const latestConsultation =
    consultations.find((c) => c.status === "draft") ?? consultations[0];

  let consultationDetail = null;
  if (latestConsultation) {
    try {
      consultationDetail = await getConsultationById(latestConsultation.id);
    } catch {
      // ignore
    }
  }

  const patientName = `${encounter.patientFirstName ?? ""} ${encounter.patientLastName ?? ""}`.trim();
  const latestTriage = triageRecords[0];

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{patientName}</h2>
            <StatusBadge status={encounter.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            <span className="font-mono">{encounter.patientMrn}</span>
            {" · "}
            {encounter.type.replace(/_/g, " ")}
            {encounter.patientDateOfBirth && (
              <>
                {" · DOB: "}
                {new Date(encounter.patientDateOfBirth).toLocaleDateString()}
              </>
            )}
            {encounter.patientSex && (
              <>
                {" · "}
                <span className="capitalize">{encounter.patientSex}</span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/consultation"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Queue
        </Link>
      </div>

      {/* Triage Summary */}
      {latestTriage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Triage Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {latestTriage.triageCategory && (
                <Badge
                  variant={
                    latestTriage.triageCategory === "emergency"
                      ? "destructive"
                      : latestTriage.triageCategory === "urgent"
                        ? "warning"
                        : "default"
                  }
                >
                  {latestTriage.triageCategory}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Recorded {new Date(latestTriage.recordedAt).toLocaleString()}
              </span>
            </div>
            {latestTriage.chiefComplaint && (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Chief Complaint: </span>
                {latestTriage.chiefComplaint}
              </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              {latestTriage.temperature != null && (
                <span>Temp: {latestTriage.temperature}°C</span>
              )}
              {latestTriage.bpSystolic != null && latestTriage.bpDiastolic != null && (
                <span>
                  BP: {latestTriage.bpSystolic}/{latestTriage.bpDiastolic}
                </span>
              )}
              {latestTriage.heartRate != null && (
                <span>HR: {latestTriage.heartRate} bpm</span>
              )}
              {latestTriage.oxygenSaturation != null && (
                <span>SpO₂: {latestTriage.oxygenSaturation}%</span>
              )}
              {latestTriage.respiratoryRate != null && (
                <span>RR: {latestTriage.respiratoryRate}/min</span>
              )}
              {latestTriage.painScore != null && (
                <span>Pain: {latestTriage.painScore}/10</span>
              )}
              {latestTriage.weight != null && (
                <span>Weight: {latestTriage.weight} kg</span>
              )}
              {latestTriage.height != null && (
                <span>Height: {latestTriage.height} cm</span>
              )}
            </div>
            {latestTriage.allergies && (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Allergies: </span>
                {latestTriage.allergies}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consultation Form */}
      <ConsultationForm
        encounterId={encounterId}
        patientId={encounter.patientId}
        providerId={session.user.id}
        consultationId={latestConsultation?.id}
        initialData={
          consultationDetail
            ? {
                chiefComplaint: consultationDetail.chiefComplaint,
                history: consultationDetail.history,
                examination: consultationDetail.examination,
                assessment: consultationDetail.assessment,
                treatmentPlan: consultationDetail.treatmentPlan,
                clinicalNotes: consultationDetail.clinicalNotes,
                followUpDate: consultationDetail.followUpDate
                  ? consultationDetail.followUpDate.toISOString().split("T")[0]
                  : null,
                followUpInstructions: consultationDetail.followUpInstructions,
                status: consultationDetail.status,
              }
            : undefined
        }
        initialDiagnoses={consultationDetail?.diagnoses?.map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          type: d.type,
          isPrimary: d.isPrimary,
        }))}
        isFinalized={latestConsultation?.status === "finalized"}
      />
    </div>
  );
}
