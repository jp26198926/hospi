import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as queueService from "@/modules/queue/service";
import { updateQueuePrioritySchema } from "@/modules/queue/validation";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const PATCH = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.QUEUE_UPDATE);
  const id = extractId(req);
  const body = updateQueuePrioritySchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await queueService.updateQueuePriority(id, body.priority, session.user.id, meta);
  return successResponse(data);
});
