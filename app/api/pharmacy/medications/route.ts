import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/pharmacy/catalog-service";
import { listMedicationsQuerySchema, createMedicationSchema } from "@/modules/pharmacy/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.PHARMACY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listMedicationsQuerySchema.parse({
    active: params.get("active") ?? undefined,
    search: params.get("search") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await catalogService.listMedications(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PHARMACY_INVENTORY);
  const body = createMedicationSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.createMedication(body, session.user.id, meta);
  return successResponse(data, 201);
});
