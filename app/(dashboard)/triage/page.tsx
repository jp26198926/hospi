import { QueueBoard } from "@/components/queue/queue-board";

export default function TriagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Triage</h2>
        <p className="text-muted-foreground">
          Manage the triage queue and record patient vitals.
        </p>
      </div>
      <QueueBoard queueType="triage" />
    </div>
  );
}
