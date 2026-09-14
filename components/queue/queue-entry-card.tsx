import { Badge } from "@/components/ui/badge";

interface QueueEntry {
  id: string;
  queueNumber: number;
  queueType: string;
  priority: string;
  status: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
  createdAt: string;
  staffFirstName?: string | null;
  staffLastName?: string | null;
}

interface QueueEntryCardProps {
  entry: QueueEntry;
}

const priorityVariant: Record<string, "default" | "warning" | "destructive"> = {
  normal: "default",
  urgent: "warning",
  emergency: "destructive",
};

function formatWaitTime(createdAt: string): string {
  const waitMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  );
  return waitMinutes < 60
    ? `${waitMinutes}m`
    : `${Math.floor(waitMinutes / 60)}h ${waitMinutes % 60}m`;
}

export function QueueEntryCard({ entry }: QueueEntryCardProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
        {entry.queueNumber}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {entry.patientFirstName} {entry.patientLastName}
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.patientMrn} · Waiting {formatWaitTime(entry.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant={priorityVariant[entry.priority] ?? "default"}>
          {entry.priority}
        </Badge>
      </div>
    </div>
  );
}
