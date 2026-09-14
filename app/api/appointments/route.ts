import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as appointmentService from "@/modules/appointments/service";
import { listAppointmentsQuerySchema, createAppointmentSchema } from "@/modules/appointments/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.APPOINTMENT_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listAppointmentsQuerySchema.parse({
    date: params.get("date") ?? undefined,
    staffId: params.get("staffId") ?? undefined,
    patientId: params.get("patientId") ?? undefined,
    status: params.get("status") ?? undefined,
    departmentId: params.get("departmentId") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await appointmentService.listAppointments(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.APPOINTMENT_CREATE);
  const body = createAppointmentSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await appointmentService.createAppointment(body, session.user.id, meta);
  return successResponse(data, 201);
});
