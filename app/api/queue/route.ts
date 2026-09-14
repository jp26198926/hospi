import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as queueService from "@/modules/queue/service";
import { listQueueEntriesQuerySchema, createQueueEntrySchema } from "@/modules/queue/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.QUEUE_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listQueueEntriesQuerySchema.parse({
    queueType: params.get("queueType") ?? undefined,
    status: params.get("status") ?? undefined,
    departmentId: params.get("departmentId") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await queueService.listQueueEntries(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.QUEUE_CREATE);
  const body = createQueueEntrySchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await queueService.createQueueEntry(body, session.user.id, meta);
  return successResponse(data, 201);
});
