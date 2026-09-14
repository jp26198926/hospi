import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as consultationService from "@/modules/consultation/service";
import { updateConsultationSchema } from "@/modules/consultation/validation";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.CONSULTATION_VIEW);
  const id = extractId(req);
  const data = await consultationService.getConsultationById(id);
  return successResponse(data);
});

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.CONSULTATION_UPDATE);
  const id = extractId(req);
  const body = updateConsultationSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await consultationService.updateConsultation(id, body, session.user.id, meta);
  return successResponse(data);
});
