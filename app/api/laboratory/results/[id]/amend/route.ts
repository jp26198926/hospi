import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as labService from "@/modules/laboratory/service";
import { z } from "zod";

const amendSchema = z.object({
  value: z.string().min(1),
  unit: z.string().optional(),
  reason: z.string().min(1).max(500),
});

function extractResultId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.LABORATORY_RESULT);
  const resultId = extractResultId(req);
  const body = amendSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await labService.amendResult(resultId, body, session.user.id, meta);
  return successResponse(data, 201);
});
