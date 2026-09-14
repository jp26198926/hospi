"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AppointmentActionsClientProps {
  id: string;
  status: string;
}

export function AppointmentActionsClient({ id, status }: AppointmentActionsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function action(path: string, label: string) {
    setLoading(label);
    try {
      const res = await fetch(`/api/appointments/${id}/${path}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  const canCheckIn = status === "scheduled" || status === "confirmed";
  const canCancel =
    status === "scheduled" || status === "confirmed" || status === "checked_in";
  const canNoShow = status === "scheduled" || status === "confirmed";

  if (!canCheckIn && !canCancel && !canNoShow) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {canCheckIn && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => action("check-in", "checkin")}
          loading={loading === "checkin"}
        >
          Check In
        </Button>
      )}
      {canCancel && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const reason = window.prompt("Cancellation reason:");
            if (reason) {
              fetch(`/api/appointments/${id}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
              }).then(() => router.refresh());
            }
          }}
          disabled={loading !== null}
        >
          Cancel
        </Button>
      )}
      {canNoShow && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => action("no-show", "noshow")}
          loading={loading === "noshow"}
        >
          No Show
        </Button>
      )}
    </div>
  );
}
