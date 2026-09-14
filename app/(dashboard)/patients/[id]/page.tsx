import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatientById } from "@/modules/patients/service";
import { listEncounters } from "@/modules/encounters/service";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default async function PatientDetailPage({
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

  const encounters = await listEncounters({ patientId: id, page: 1, limit: 10 });

  function calculateAge(dateOfBirth: string): number {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {patient.firstName} {patient.middleName ? `${patient.middleName} ` : ""}
              {patient.lastName}
              {patient.suffix ? ` ${patient.suffix}` : ""}
            </h2>
            <StatusBadge status={patient.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            <span className="font-mono">{patient.mrn}</span>
            {" · "}
            {age} years old · {patient.sex}
          </p>
        </div>
        <Link
          href={`/patients/${id}/edit`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Edit Patient
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date of Birth</span>
              <span>{new Date(patient.dateOfBirth).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sex</span>
              <span className="capitalize">{patient.sex}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blood Type</span>
              <span>{patient.bloodType ?? "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registered</span>
              <span>{new Date(patient.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{patient.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{patient.email ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right">
                {patient.addressLine1 || patient.city
                  ? [patient.addressLine1, patient.addressLine2, patient.city, patient.province, patient.postalCode]
                      .filter(Boolean)
                      .join(", ")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Country</span>
              <span>{patient.country ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{patient.emergencyContactName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{patient.emergencyContactPhone ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Relationship</span>
              <span>{patient.emergencyContactRelationship ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Blood Type: </span>
              <Badge variant="info">{patient.bloodType ?? "Unknown"}</Badge>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Allergies</p>
              <p className="whitespace-pre-wrap">{patient.allergies || "None recorded"}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Medical Alerts</p>
              <p className="whitespace-pre-wrap">{patient.medicalAlerts || "None recorded"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Encounters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Encounters</CardTitle>
        </CardHeader>
        <CardContent>
          {encounters.items.length === 0 ? (
            <EmptyState
              title="No encounters"
              description="This patient has no encounters yet."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {encounters.items.map((enc) => (
                      <TableRow key={enc.id}>
                        <TableCell>
                          {new Date(enc.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {enc.type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={enc.status} />
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {enc.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 md:hidden">
                {encounters.items.map((enc) => (
                  <div key={enc.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {enc.type.replace(/_/g, " ")}
                      </span>
                      <StatusBadge status={enc.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(enc.createdAt).toLocaleDateString()}
                    </p>
                    {enc.notes && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {enc.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
