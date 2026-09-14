import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/radiology/catalog-service";
import { createModalitySchema } from "@/modules/radiology/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.RADIOLOGY_VIEW);
  const data = await catalogService.listModalities();
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.RADIOLOGY_ORDER);
  const body = createModalitySchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.createModality(body, session.user.id, meta);
  return successResponse(data, 201);
});
