import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as appointmentService from "@/modules/appointments/service";

function extractAppointmentId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /api/appointments/[id]/check-in → parts = [..., id, check-in]
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.APPOINTMENT_UPDATE);
  const id = extractAppointmentId(req);
  const meta = getRequestMeta(req);
  const data = await appointmentService.checkInAppointment(id, session.user.id, meta);
  return successResponse(data);
});
