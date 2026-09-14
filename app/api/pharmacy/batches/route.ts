import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as inventoryService from "@/modules/pharmacy/inventory-service";
import { listBatchesQuerySchema, receiveBatchSchema } from "@/modules/pharmacy/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.PHARMACY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listBatchesQuerySchema.parse({
    medicationId: params.get("medicationId") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await inventoryService.listBatches(query);
  return successResponse(data);
});

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PHARMACY_INVENTORY);
  const body = receiveBatchSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await inventoryService.receiveBatch(body, session.user.id, meta);
  return successResponse(data, 201);
});
