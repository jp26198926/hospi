import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as encounterService from "@/modules/encounters/service";
import { updateEncounterSchema } from "@/modules/encounters/validation";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.ENCOUNTER_VIEW);
  const id = extractId(req);
  const data = await encounterService.getEncounterById(id);
  return successResponse(data);
});

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.ENCOUNTER_UPDATE);
  const id = extractId(req);
  const body = updateEncounterSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await encounterService.updateEncounter(id, body, session.user.id, meta);
  return successResponse(data);
});
