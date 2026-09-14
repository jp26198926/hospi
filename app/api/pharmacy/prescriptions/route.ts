import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as pharmacyService from "@/modules/pharmacy/service";
import { listPrescriptionsQuerySchema, createPrescriptionSchema } from "@/modules/pharmacy/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.PHARMACY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listPrescriptionsQuerySchema.parse({
    status: params.get("status") ?? undefined,
    patientId: params.get("patientId") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await pharmacyService.listPrescriptions(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PHARMACY_PRESCRIBE);
  const body = createPrescriptionSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await pharmacyService.createPrescription(body, session.user.id, meta);
  return successResponse(data, 201);
});
