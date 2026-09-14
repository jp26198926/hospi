import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as catalogService from "@/modules/laboratory/catalog-service";
import { createPanelSchema } from "@/modules/laboratory/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.LABORATORY_VIEW);
  const data = await catalogService.listPanels();
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_CREATE);
  const body = createPanelSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await catalogService.createPanel(body, session.user.id, meta);
  return successResponse(data, 201);
});
