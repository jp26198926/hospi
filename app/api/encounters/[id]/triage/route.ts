import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as triageService from "@/modules/triage/service";
import { createTriageRecordSchema } from "@/modules/triage/validation";

function extractEncounterId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /api/encounters/[id]/triage → parts = [api, encounters, id, triage]
  return parts[parts.length - 2];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.TRIAGE_VIEW);
  const encounterId = extractEncounterId(req);
  const data = await triageService.listTriageRecords(encounterId);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.TRIAGE_CREATE);
  const encounterId = extractEncounterId(req);
  const raw = createTriageRecordSchema.parse(await req.json());
  // Ensure encounterId from URL matches body (or override)
  const body = { ...raw, encounterId };
  const meta = getRequestMeta(req);
  const data = await triageService.createTriageRecord(body, session.user.id, meta);
  return successResponse(data, 201);
});
