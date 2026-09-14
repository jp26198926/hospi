import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/radiology/catalog-service";
import { listProceduresQuerySchema, createProcedureSchema } from "@/modules/radiology/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.RADIOLOGY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listProceduresQuerySchema.parse({
    modalityId: params.get("modalityId") ?? undefined,
    active: params.get("active") ?? undefined,
    search: params.get("search") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await catalogService.listProcedures(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.RADIOLOGY_ORDER);
  const body = createProcedureSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.createProcedure(body, session.user.id, meta);
  return successResponse(data, 201);
});
