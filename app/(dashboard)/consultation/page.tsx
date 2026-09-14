import { QueueBoard } from "@/components/queue/queue-board";

export default function ConsultationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Consultation</h2>
        <p className="text-muted-foreground">
          Manage the consultation queue and attend to patients.
        </p>
      </div>
      <QueueBoard queueType="consultation" />
    </div>
  );
}
