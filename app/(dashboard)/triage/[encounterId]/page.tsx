import Link from "next/link";
import { notFound } from "next/navigation";
import { getEncounterById } from "@/modules/encounters/service";
import { listTriageRecords } from "@/modules/triage/service";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { VitalsForm } from "@/components/triage/vitals-form";

export default async function TriageEncounterPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = await params;

  let encounter;
  try {
    encounter = await getEncounterById(encounterId);
  } catch {
    notFound();
  }

  const triageRecords = await listTriageRecords(encounterId);
  const patientName = `${encounter.patientFirstName ?? ""} ${encounter.patientLastName ?? ""}`.trim();

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
          </p>
        </div>
        <Link
          href="/triage"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Back to Queue
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vitals Form */}
        <VitalsForm encounterId={encounterId} patientName={patientName} />

        {/* Previous Vitals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            {triageRecords.length === 0 ? (
              <EmptyState
                title="No vitals recorded"
                description="Vitals recorded for this encounter will appear here."
              />
            ) : (
              <div className="space-y-4">
                {triageRecords.map((record) => (
                  <div key={record.id} className="rounded-md border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {new Date(record.recordedAt).toLocaleString()}
                      </span>
                      {record.triageCategory && (
                        <Badge
                          variant={
                            record.triageCategory === "emergency"
                              ? "destructive"
                              : record.triageCategory === "urgent"
                                ? "warning"
                                : "default"
                          }
                        >
                          {record.triageCategory}
                        </Badge>
                      )}
                    </div>
                    {record.chiefComplaint && (
                      <p className="mb-2 text-sm">
                        <span className="text-muted-foreground">Complaint: </span>
                        {record.chiefComplaint}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                      {record.temperature != null && (
                        <span>Temp: {record.temperature}°C</span>
                      )}
                      {record.bpSystolic != null && record.bpDiastolic != null && (
                        <span>
                          BP: {record.bpSystolic}/{record.bpDiastolic}
                        </span>
                      )}
                      {record.heartRate != null && (
                        <span>HR: {record.heartRate} bpm</span>
                      )}
                      {record.respiratoryRate != null && (
                        <span>RR: {record.respiratoryRate}/min</span>
                      )}
                      {record.oxygenSaturation != null && (
                        <span>SpO₂: {record.oxygenSaturation}%</span>
                      )}
                      {record.painScore != null && (
                        <span>Pain: {record.painScore}/10</span>
                      )}
                      {record.weight != null && (
                        <span>Weight: {record.weight} kg</span>
                      )}
                      {record.height != null && (
                        <span>Height: {record.height} cm</span>
                      )}
                    </div>
                    {record.allergies && (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Allergies: </span>
                        {record.allergies}
                      </p>
                    )}
                    {record.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{record.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
