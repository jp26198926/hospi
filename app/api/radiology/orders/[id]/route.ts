import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import * as radService from "@/modules/radiology/service";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.RADIOLOGY_VIEW);
  const id = extractId(req);
  const data = await radService.getRadiologyOrderDetail(id);
  return successResponse(data);
});
