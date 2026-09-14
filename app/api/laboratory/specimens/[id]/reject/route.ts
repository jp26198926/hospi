import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as labService from "@/modules/laboratory/service";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

function extractSpecimenId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_PROCESS);
  const specimenId = extractSpecimenId(req);
  const body = rejectSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await labService.rejectSpecimen(specimenId, body.reason, session.user.id, meta);
  return successResponse(data);
});
