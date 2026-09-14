import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as diagnosisService from "@/modules/diagnosis/service";
import { createDiagnosisSchema } from "@/modules/diagnosis/validation";

function extractEncounterId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /api/encounters/[id]/diagnoses → parts = [api, encounters, id, diagnoses]
  return parts[parts.length - 2];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.DIAGNOSIS_VIEW);
  const encounterId = extractEncounterId(req);
  const data = await diagnosisService.listDiagnosesByEncounter(encounterId);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.DIAGNOSIS_CREATE);
  const encounterId = extractEncounterId(req);
  const raw = createDiagnosisSchema.parse(await req.json());
  const body = { ...raw, encounterId };
  const meta = getRequestMeta(req);
  const data = await diagnosisService.createDiagnosis(body, session.user.id, meta);
  return successResponse(data, 201);
});
