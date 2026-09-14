import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as consultationService from "@/modules/consultation/service";
import { createConsultationSchema } from "@/modules/consultation/validation";

function extractEncounterId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /api/encounters/[id]/consultations → parts = [api, encounters, id, consultations]
  return parts[parts.length - 2];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.CONSULTATION_VIEW);
  const encounterId = extractEncounterId(req);
  const data = await consultationService.listConsultationsByEncounter(encounterId);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.CONSULTATION_CREATE);
  const encounterId = extractEncounterId(req);
  const raw = createConsultationSchema.parse(await req.json());
  const body = { ...raw, encounterId };
  const meta = getRequestMeta(req);
  const data = await consultationService.createConsultation(body, session.user.id, meta);
  return successResponse(data, 201);
});
