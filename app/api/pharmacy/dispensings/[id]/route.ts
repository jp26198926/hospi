import { executeRoute } from "@/lib/api/execute";
import { successResponse } from "@/lib/errors/api";
import { requirePermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import * as pharmacyService from "@/modules/pharmacy/service";

function extractId(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export const GET = executeRoute(async (req) => {
  await requirePermission(PERMISSIONS.PHARMACY_VIEW);
  const id = extractId(req);
  const data = await pharmacyService.getDispensingDetail(id);
  return successResponse(data);
});
