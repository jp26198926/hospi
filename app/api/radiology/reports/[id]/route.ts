import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as radService from "@/modules/radiology/service";
import { updateReportSchema } from "@/modules/radiology/validation";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.RADIOLOGY_VIEW);
  const id = extractId(req);
  const data = await radService.getReportById(id);
  return successResponse(data);
});

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.RADIOLOGY_REPORT);
  const id = extractId(req);
  const body = updateReportSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await radService.updateReport(id, body, session.user.id, meta);
  return successResponse(data);
});
