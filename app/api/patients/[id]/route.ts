import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as patientService from "@/modules/patients/service";
import { updatePatientSchema } from "@/modules/patients/validation";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.PATIENT_VIEW);
  const id = extractId(req);
  const data = await patientService.getPatientById(id);
  return successResponse(data);
});

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PATIENT_UPDATE);
  const id = extractId(req);
  const body = updatePatientSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await patientService.updatePatient(id, body, session.user.id, meta);
  return successResponse(data);
});
