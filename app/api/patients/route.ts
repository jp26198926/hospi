import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as patientService from "@/modules/patients/service";
import { listPatientsQuerySchema, createPatientSchema } from "@/modules/patients/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.PATIENT_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listPatientsQuerySchema.parse({
    search: params.get("search") ?? undefined,
    status: params.get("status") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await patientService.listPatients(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PATIENT_CREATE);
  const body = createPatientSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await patientService.createPatient(body, session.user.id, meta);
  return successResponse(data, 201);
});
