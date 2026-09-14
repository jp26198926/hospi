import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as queueService from "@/modules/queue/service";
import { callQueueEntrySchema } from "@/modules/queue/validation";

function extractQueueId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.QUEUE_CALL);
  const id = extractQueueId(req);
  const body = callQueueEntrySchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await queueService.callQueueEntry(id, body.staffId, session.user.id, meta);
  return successResponse(data);
});
