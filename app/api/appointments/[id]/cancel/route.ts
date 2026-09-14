import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as appointmentService from "@/modules/appointments/service";
import { cancelAppointmentSchema } from "@/modules/appointments/validation";

function extractAppointmentId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.APPOINTMENT_CANCEL);
  const id = extractAppointmentId(req);
  const body = cancelAppointmentSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await appointmentService.cancelAppointment(id, body.reason, session.user.id, meta);
  return successResponse(data);
});
