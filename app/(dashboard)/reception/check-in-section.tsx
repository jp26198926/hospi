"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

interface Appointment {
  id: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
  startTime: string;
  endTime: string;
  status: string;
  reason: string | null;
}

interface CheckInSectionProps {
  appointments: Appointment[];
}

export function CheckInSection({ appointments }: CheckInSectionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleCheckIn(id: string) {
    setError(null);
    setLoadingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/check-in`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to check in");
        return;
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appointment Check-in</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {appointments.length === 0 ? (
          <EmptyState
            title="No pending check-ins"
            description="Appointments scheduled for today will appear here."
          />
        ) : (
          <div className="space-y-2">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {apt.patientFirstName} {apt.patientLastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {apt.patientMrn} · {apt.startTime}–{apt.endTime}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={apt.status} />
                  <Button
                    size="sm"
                    onClick={() => handleCheckIn(apt.id)}
                    loading={loadingId === apt.id}
                  >
                    Check In
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
