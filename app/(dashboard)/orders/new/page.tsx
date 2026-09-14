import { OrderForm } from "@/components/orders/order-form";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const encounterId = typeof sp.encounterId === "string" ? sp.encounterId : undefined;
  const patientId = typeof sp.patientId === "string" ? sp.patientId : undefined;
  const consultationId =
    typeof sp.consultationId === "string" ? sp.consultationId : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Order</h2>
        <p className="text-muted-foreground">
          Create a laboratory, radiology, or medication order.
        </p>
      </div>

      <OrderForm
        encounterId={encounterId}
        patientId={patientId}
        consultationId={consultationId}
      />
    </div>
  );
}
