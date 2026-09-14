import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as patientService from "@/modules/patients/service";
import { mergePatientsSchema } from "@/modules/patients/validation";

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PATIENT_MERGE);
  const body = mergePatientsSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await patientService.mergePatients(body, session.user.id, meta);
  return successResponse(data);
});
