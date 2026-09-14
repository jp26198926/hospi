import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as consultationService from "@/modules/consultation/service";

function extractConsultationId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.CONSULTATION_FINALIZE);
  const id = extractConsultationId(req);
  const meta = getRequestMeta(req);
  const data = await consultationService.finalizeConsultation(id, session.user.id, meta);
  return successResponse(data);
});
