import { listEncounters } from "@/modules/encounters/service";
import { listAppointments } from "@/modules/appointments/service";
import { listDepartments, listServices } from "@/modules/master/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QueueBoard } from "@/components/queue/queue-board";
import { WalkInForm } from "./walk-in-form";
import { CheckInSection } from "./check-in-section";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const today = new Date().toISOString().split("T")[0];

  const [recentEncounters, todayAppointments, departments, services] = await Promise.all([
    listEncounters({ page: 1, limit: 10 }),
    listAppointments({ date: today, page: 1, limit: 20 }),
    listDepartments({ activeOnly: true }),
    listServices({ activeOnly: true }),
  ]);

  const pendingCheckIns = todayAppointments.items.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reception</h2>
        <p className="text-muted-foreground">
          Manage walk-ins, check-ins, and the reception queue.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Walk-in Form */}
        <WalkInForm departments={departments} services={services} />

        {/* Check-in Section */}
        <CheckInSection appointments={pendingCheckIns} />
      </div>

      {/* Reception Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reception Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <QueueBoard queueType="reception" />
        </CardContent>
      </Card>

      {/* Recent Encounters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Encounters</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEncounters.items.length === 0 ? (
            <EmptyState
              title="No recent encounters"
              description="Encounters created today will appear here."
            />
          ) : (
            <div className="space-y-2">
              {recentEncounters.items.map((enc) => (
                <div
                  key={enc.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {enc.patientFirstName} {enc.patientLastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {enc.patientMrn} · {enc.type.replace(/_/g, " ")} ·{" "}
                      {new Date(enc.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <StatusBadge status={enc.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
