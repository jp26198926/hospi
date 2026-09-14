import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as inventoryService from "@/modules/pharmacy/inventory-service";
import { returnStockSchema } from "@/modules/pharmacy/validation";

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PHARMACY_RETURN);
  const body = returnStockSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await inventoryService.returnStock(body, session.user.id, meta);
  return successResponse(data);
});
