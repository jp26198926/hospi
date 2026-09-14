import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getRequestMeta } from "@/lib/audit";
import * as inventoryService from "@/modules/pharmacy/inventory-service";
import { markExpiredSchema } from "@/modules/pharmacy/validation";

export const POST = executeRoute(async (req) => {
  const session = await requirePermission(PERMISSIONS.PHARMACY_INVENTORY);
  const body = markExpiredSchema.parse(await req.json());
  const meta = getRequestMeta(req);
  const data = await inventoryService.markExpired(body, session.user.id, meta);
  return successResponse(data);
});
