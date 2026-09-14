import Link from "next/link";
import { listAppointments } from "@/modules/appointments/service";

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
import { AppointmentsPageClient } from "./appointments-page-client";
import { AppointmentActionsClient } from "./appointment-actions";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const date = typeof sp.date === "string" ? sp.date : today;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) || 1 : 1;

  const result = await listAppointments({ date, status, page, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
          <p className="text-muted-foreground">
            {result.total} appointment{result.total !== 1 ? "s" : ""} for{" "}
            {new Date(date).toLocaleDateString()}
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Appointment
        </Link>
      </div>

      <AppointmentsPageClient
        initialDate={date}
        initialStatus={status ?? ""}
        page={result.page}
        totalPages={result.totalPages}
      />

      {result.items.length === 0 ? (
        <EmptyState
          title="No appointments"
          description="No appointments found for the selected date."
          action={
            <Link
              href="/appointments/new"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              New Appointment
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
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell>
                      {apt.startTime}–{apt.endTime}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {apt.patientFirstName} {apt.patientLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{apt.patientMrn}</p>
                    </TableCell>
                    <TableCell>
                      {apt.staffFirstName
                        ? `${apt.staffFirstName} ${apt.staffLastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {apt.reason ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={apt.status} />
                    </TableCell>
                    <TableCell>
                      <AppointmentActionsClient id={apt.id} status={apt.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {result.items.map((apt) => (
              <div key={apt.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {apt.patientFirstName} {apt.patientLastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{apt.patientMrn}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>
                    {apt.startTime}–{apt.endTime}
                  </p>
                  {apt.staffFirstName && (
                    <p>
                      {apt.staffFirstName} {apt.staffLastName}
                    </p>
                  )}
                  {apt.reason && <p className="truncate">{apt.reason}</p>}
                </div>
                <div className="mt-3">
                  <AppointmentActionsClient id={apt.id} status={apt.status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
