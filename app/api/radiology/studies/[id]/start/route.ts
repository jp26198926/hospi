import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as radService from "@/modules/radiology/service";

function extractStudyId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.RADIOLOGY_SCHEDULE);
  const studyId = extractStudyId(req);
  const meta = getRequestMeta(req);
  const data = await radService.startStudy(studyId, session.user.id, meta);
  return successResponse(data);
});
