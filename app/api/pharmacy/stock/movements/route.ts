import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import * as inventoryService from "@/modules/pharmacy/inventory-service";
import { listStockMovementsQuerySchema } from "@/modules/pharmacy/validation";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const params = new URL(req.url).searchParams;
  const query = listStockMovementsQuerySchema.parse({
    medicationId: params.get("medicationId") ?? undefined,
    batchId: params.get("batchId") ?? undefined,
    type: params.get("type") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  const data = await inventoryService.listStockMovements(query);
  return successResponse(data);
});
