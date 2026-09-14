import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import * as inventoryService from "@/modules/pharmacy/inventory-service";

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const data = await inventoryService.listReorderAlerts();
  return successResponse(data);
});
