import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as inventoryService from "@/modules/pharmacy/inventory-service";
import { transferStockSchema } from "@/modules/pharmacy/validation";

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.INVENTORY_TRANSFER);
  const body = transferStockSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await inventoryService.transferStock(body, session.user.id, meta);
  return successResponse(data);
});
