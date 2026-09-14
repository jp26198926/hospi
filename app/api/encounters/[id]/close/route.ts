import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as encounterService from "@/modules/encounters/service";

function extractEncounterId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /api/encounters/[id]/close → parts = [api, encounters, id, close]
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.ENCOUNTER_CLOSE);
  const id = extractEncounterId(req);
  const meta = getRequestMeta(req);
  const data = await encounterService.closeEncounter(id, session.user.id, meta);
  return successResponse(data);
});
