"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { QueueEntryCard } from "./queue-entry-card";

interface QueueEntry {
  id: string;
  queueNumber: number;
  queueType: string;
  priority: string;
  status: string;
  patientId: string;
  encounterId: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
  createdAt: string;
  calledTime: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
}

interface QueueBoardProps {
  queueType: "reception" | "triage" | "consultation";
}

const priorityVariant: Record<string, "default" | "warning" | "destructive"> = {
  normal: "default",
  urgent: "warning",
  emergency: "destructive",
};

export function QueueBoard({ queueType }: QueueBoardProps) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue?queueType=${queueType}&limit=50`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data.items ?? []);
        setError(null);
      } else {
        setError(json.error?.message || "Failed to load queue");
      }
    } catch {
      setError("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [queueType]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/queue?queueType=${queueType}&limit=50`);
        const json = await res.json();
        if (!cancelled) {
          if (json.success) {
            setEntries(json.data.items ?? []);
            setError(null);
          } else {
            setError(json.error?.message || "Failed to load queue");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load queue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [queueType]);

  async function callNext() {
    const waiting = entries.find((e) => e.status === "waiting");
    if (!waiting) return;

    setActionLoading(waiting.id);
    try {
      const res = await fetch(`/api/queue/${waiting.id}/call`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchQueue();
      } else {
        setError(json.error?.message || "Failed to call patient");
      }
    } catch {
      setError("Failed to call patient");
    } finally {
      setActionLoading(null);
    }
  }

  async function completeEntry(id: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/queue/${id}/complete`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchQueue();
      } else {
        setError(json.error?.message || "Failed to complete entry");
      }
    } catch {
      setError("Failed to complete entry");
    } finally {
      setActionLoading(null);
    }
  }

  const waitingCount = entries.filter((e) => e.status === "waiting").length;
  const inProgressCount = entries.filter(
    (e) => e.status === "called" || e.status === "in_progress"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant="warning">Waiting: {waitingCount}</Badge>
          <Badge variant="info">In progress: {inProgressCount}</Badge>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={callNext}
          disabled={waitingCount === 0 || actionLoading !== null}
          loading={actionLoading !== null && entries.some((e) => e.id === actionLoading && e.status === "waiting")}
        >
          Call Next
        </Button>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Loading queue…</p>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Queue is empty"
          description={`No patients in the ${queueType} queue.`}
        />
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <QueueEntryCard entry={entry} />
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={entry.status} />
                    <Badge variant={priorityVariant[entry.priority] ?? "default"}>
                      {entry.priority}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {entry.status === "waiting" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          setActionLoading(entry.id);
                          try {
                            const res = await fetch(`/api/queue/${entry.id}/call`, {
                              method: "POST",
                            });
                            const json = await res.json();
                            if (json.success) await fetchQueue();
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        loading={actionLoading === entry.id}
                      >
                        Call
                      </Button>
                    )}
                    {(entry.status === "called" || entry.status === "in_progress") && (
                      <Button
                        size="sm"
                        onClick={() => completeEntry(entry.id)}
                        loading={actionLoading === entry.id}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
