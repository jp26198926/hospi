import Link from "next/link";
import { listPatients } from "@/modules/patients/service";

export const dynamic = "force-dynamic";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PatientCard } from "@/components/patients/patient-card";
import { PatientsPageClient } from "./patients-page-client";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) || 1 : 1;

  const result = await listPatients({ search, status, page, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Patients</h2>
          <p className="text-muted-foreground">
            {result.total} patient{result.total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Register Patient
        </Link>
      </div>

      <PatientsPageClient
        initialSearch={search ?? ""}
        initialStatus={status ?? ""}
        page={result.page}
        totalPages={result.totalPages}
      />

      {result.items.length === 0 ? (
        <EmptyState
          title="No patients found"
          description={
            search || status
              ? "Try adjusting your search or filters."
              : "Register your first patient to get started."
          }
          action={
            <Link
              href="/patients/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Register Patient
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-mono text-xs">{patient.mrn}</TableCell>
                    <TableCell>
                      <Link
                        href={`/patients/${patient.id}`}
                        className="font-medium hover:underline"
                      >
                        {patient.firstName} {patient.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">{patient.sex}</TableCell>
                    <TableCell>{patient.phone ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={patient.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {result.items.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
