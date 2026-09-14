import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as radService from "@/modules/radiology/service";
import { listRadiologyOrdersQuerySchema, createRadiologyOrderSchema } from "@/modules/radiology/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.RADIOLOGY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listRadiologyOrdersQuerySchema.parse({
    status: params.get("status") ?? undefined,
    priority: params.get("priority") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await radService.listRadiologyOrders(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.RADIOLOGY_ORDER);
  const body = createRadiologyOrderSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await radService.createRadiologyOrder(body, session.user.id, meta);
  return successResponse(data.order, 201);
});
