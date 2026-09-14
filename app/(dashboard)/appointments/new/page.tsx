import { AppointmentForm } from "@/components/appointments/appointment-form";

export default function NewAppointmentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Appointment</h2>
        <p className="text-muted-foreground">Book a new appointment for a patient.</p>
      </div>
      <AppointmentForm />
    </div>
  );
}
